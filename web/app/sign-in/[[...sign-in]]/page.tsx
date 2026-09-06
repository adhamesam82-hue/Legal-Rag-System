"use client";

import { Suspense, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthFrame } from "@/components/AuthFrame";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { withRedirect } from "@/lib/redirect-url";

// useSearchParams() in a Client Component requires a Suspense boundary --
// without one, `next build` fails outright (it has no way to prerender a
// static shell around request-time query data). The default export below
// is the boundary; this inner component is what actually reads the param.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <RedirectIfSignedIn>
        <SignInForm />
      </RedirectIfSignedIn>
    </Suspense>
  );
}

/**
 * Which form is on screen.
 *
 *   password      email + password
 *   clientTrust   the extra email code Clerk asks for on a new device
 *   resetEmail    "forgot password": which address to send the code to
 *   resetCode     the reset code from that email
 *   resetPassword the new password
 *
 * One component rather than a route per step because every step shares the
 * same sign-in attempt object: Clerk keeps the attempt in the SDK, and
 * navigating away would drop it mid-flow.
 */
type Step = "password" | "clientTrust" | "resetEmail" | "resetCode" | "resetPassword";

// Clerk's code for "no account has this identifier". This is the one error
// the reset flow must NOT show, because showing it tells a stranger which
// addresses are clients of the firm. Every other error is shown as received.
const IDENTIFIER_NOT_FOUND = "form_identifier_not_found";

const HEADING_KEY: Record<Step, string> = {
  password: "@legalos.auth.signIn.title",
  clientTrust: "@legalos.auth.signIn.title",
  resetEmail: "@legalos.auth.reset.title",
  resetCode: "@legalos.auth.reset.title",
  resetPassword: "@legalos.auth.reset.newPasswordTitle",
};

function SignInForm() {
  const t = useTranslator();
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resent, setResent] = useState(false);
  // signIn.password() and friends return { error } rather than throwing;
  // without checking it, a rejected step leaves the button re-enabled with no
  // explanation, since errors.fields only covers per-field validation.
  const [globalError, setGlobalError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  function go(next: Step) {
    setGlobalError(null);
    setResent(false);
    setStep(next);
  }

  async function finalizeAndRedirect() {
    // The middleware redirects a signed-out visitor here with a redirect_url
    // -- honor it so they land back where they were going. "/" is the
    // landing page; /dashboard is where a firm member actually lands.
    const destination = searchParams.get("redirect_url") || "/dashboard";
    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl(destination);
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
  }

  // ------------------------------------------------------------ password

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }

    if (signIn.status === "complete") {
      await finalizeAndRedirect();
      return;
    }

    // Password verifying does not always mean the sign-in is done. On a new
    // device/browser Clerk requires an extra email-code check (its "Client
    // Trust" feature) before completing -- status comes back
    // needs_client_trust rather than complete, with no error. Skipping this
    // leaves the sign-in silently stuck: password accepted, nothing happens.
    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setGlobalError(sendError.longMessage ?? sendError.message);
        return;
      }
      go("clientTrust");
      return;
    }

    // The password was right but Clerk requires a new one (an administrator
    // reset it, or it turned up in a breach). Straight to the new-password
    // step: the code check has already been satisfied by the password.
    if (signIn.status === "needs_new_password") {
      go("resetPassword");
      return;
    }

    // needs_protect_check etc. -- real Clerk states this page has no flow
    // for. Say so rather than leaving the form inert.
    setGlobalError(t("@legalos.auth.signIn.unsupportedStep"));
  }

  // --------------------------------------------------------- client trust

  async function handleResendTrustCode() {
    setGlobalError(null);
    setResent(false);
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }
    setResent(true);
  }

  async function handleVerifyTrustCode(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const { error } = await signIn.mfa.verifyEmailCode({ code });
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }

    if (signIn.status === "complete") {
      await finalizeAndRedirect();
    } else {
      setGlobalError(t("@legalos.auth.signIn.incomplete"));
    }
  }

  // ------------------------------------------------------- password reset

  /**
   * Starts (or restarts) the reset: names the account, then asks Clerk to
   * email it a code. Returns true when the UI may advance to the code step.
   *
   * An unknown address advances too. The screen then says "if this address
   * is registered, a code is on its way", which is exactly what it says for
   * a known one -- so the response cannot be used to enumerate the firm's
   * clients. Any other failure (rate limit, delivery) is a real error the
   * person can act on, and is shown.
   */
  async function sendResetCode(): Promise<boolean> {
    const { error: createError } = await signIn.create({ identifier: email });
    if (createError) {
      if (createError.code === IDENTIFIER_NOT_FOUND) return true;
      setGlobalError(createError.longMessage ?? createError.message);
      return false;
    }
    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      if (sendError.code === IDENTIFIER_NOT_FOUND) return true;
      setGlobalError(sendError.longMessage ?? sendError.message);
      return false;
    }
    return true;
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    if (await sendResetCode()) {
      setCode("");
      go("resetCode");
    }
  }

  async function handleResendResetCode() {
    setGlobalError(null);
    setResent(false);
    if (await sendResetCode()) setResent(true);
  }

  async function handleVerifyResetCode(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }
    if (signIn.status === "needs_new_password") {
      setNewPassword("");
      go("resetPassword");
    } else {
      setGlobalError(t("@legalos.auth.reset.verifyFailed"));
    }
  }

  async function handleSubmitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    // A new password usually means the old one leaked. Every other session
    // that was opened with it is closed at the same time.
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
      signOutOfOtherSessions: true,
    });
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }
    if (signIn.status === "complete") {
      await finalizeAndRedirect();
    } else {
      setGlobalError(t("@legalos.auth.reset.saveFailed"));
    }
  }

  // ---------------------------------------------------------------- render

  const codeField = (
    <Input
      label={t("@legalos.auth.code.label")}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      errorMessage={errors?.fields?.code?.message}
    />
  );

  const emailField = (
    <Input
      label={t("@legalos.auth.signIn.email")}
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      errorMessage={errors?.fields?.identifier?.message}
    />
  );

  const formStyle = { display: "grid", gap: "14px" } as const;

  return (
    <AuthFrame title={t(HEADING_KEY[step])}>
      {step === "password" && (
        <form onSubmit={handleSubmit} style={formStyle}>
          {globalError && (
            <Alert type="danger" title={t("@legalos.auth.signIn.errorTitle")}>
              {globalError}
            </Alert>
          )}
          {emailField}
          <Input
            label={t("@legalos.auth.signIn.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            errorMessage={errors?.fields?.password?.message}
          />
          <Button
            type="submit"
            variant="primary"
            loading={busy}
          >
            {t("@legalos.auth.signIn.submit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => go("resetEmail")}
          >
            {t("@legalos.auth.signIn.forgot")}
          </Button>
          {/* The only door to sign-up from inside the app. redirect_url
              travels with it: someone who arrived from an invitation link
              and turns out not to have an account must come back to that
              invitation after signing up, not land on "create your firm"
              for a firm that already exists. */}
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.signIn.noAccount")}{" "}
            <Link
              href={withRedirect("/sign-up", searchParams.get("redirect_url"))}
              style={{ color: "var(--primary)", textDecoration: "underline" }}
            >
              {t("@legalos.auth.signIn.createFirm")}
            </Link>
          </p>
        </form>
      )}

      {step === "clientTrust" && (
        <form onSubmit={handleVerifyTrustCode} style={formStyle}>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.trust.intro", { email })}
          </p>
          {globalError && (
            <Alert type="danger" title={t("@legalos.auth.code.errorTitle")}>
              {globalError}
            </Alert>
          )}
          {resent && !globalError && (
            <Alert type="info" title={t("@legalos.auth.code.resent")} />
          )}
          {codeField}
          <Button
            type="submit"
            variant="primary"
            loading={busy}
          >
            {t("@legalos.auth.code.verify")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleResendTrustCode}
            loading={busy}
          >
            {t("@legalos.auth.code.resend")}
          </Button>
        </form>
      )}

      {step === "resetEmail" && (
        <form onSubmit={handleRequestReset} style={formStyle}>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.reset.intro")}
          </p>
          {globalError && (
            <Alert type="danger" title={t("@legalos.auth.reset.sendErrorTitle")}>
              {globalError}
            </Alert>
          )}
          {emailField}
          <Button
            type="submit"
            variant="primary"
            loading={busy}
          >
            {t("@legalos.auth.reset.sendCode")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => go("password")}
          >
            {t("@legalos.auth.reset.backToSignIn")}
          </Button>
        </form>
      )}

      {step === "resetCode" && (
        <form onSubmit={handleVerifyResetCode} style={formStyle}>
          {/* Deliberately the same sentence whether or not the address
              exists. See sendResetCode(). */}
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.reset.sentIntro", { email })}
          </p>
          {globalError && (
            <Alert type="danger" title={t("@legalos.auth.code.errorTitle")}>
              {globalError}
            </Alert>
          )}
          {resent && !globalError && (
            <Alert type="info" title={t("@legalos.auth.code.resent")} />
          )}
          {codeField}
          <Button
            type="submit"
            variant="primary"
            loading={busy}
          >
            {t("@legalos.auth.code.verify")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleResendResetCode}
            loading={busy}
          >
            {t("@legalos.auth.code.resend")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => go("resetEmail")}
          >
            {t("@legalos.auth.reset.changeEmail")}
          </Button>
        </form>
      )}

      {step === "resetPassword" && (
        <form onSubmit={handleSubmitNewPassword} style={formStyle}>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.reset.newPasswordIntro")}
          </p>
          {globalError && (
            <Alert type="danger" title={t("@legalos.auth.reset.saveErrorTitle")}>
              {globalError}
            </Alert>
          )}
          <Input
            label={t("@legalos.auth.reset.newPassword")}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            errorMessage={errors?.fields?.password?.message}
          />
          <Button
            type="submit"
            variant="primary"
            loading={busy}
          >
            {t("@legalos.auth.reset.save")}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
