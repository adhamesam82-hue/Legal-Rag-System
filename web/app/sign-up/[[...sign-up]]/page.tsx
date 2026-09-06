"use client";

import { Suspense, useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthFrame } from "@/components/AuthFrame";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";
import { withRedirect } from "@/lib/redirect-url";

// Same reason as the sign-in page: useSearchParams() needs a Suspense
// boundary or `next build` fails.
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <RedirectIfSignedIn>
        <SignUpForm />
      </RedirectIfSignedIn>
    </Suspense>
  );
}

function SignUpForm() {
  const t = useTranslator();
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  // Clerk's Future hooks (signUp.password(), .sendEmailCode(), etc.) return
  // { error } instead of throwing. Every call here must check it -- otherwise
  // a failed sendEmailCode() (rate limit, delivery rejection, ...) still
  // advances the UI to "enter the code", promising a code that was never
  // sent, with no error shown anywhere. errors.fields only covers per-field
  // validation; this is for everything else.
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const busy = fetchStatus === "fetching";

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const { error: passwordError } = await signUp.password({
      emailAddress: email,
      password,
    });
    if (passwordError) {
      setGlobalError(passwordError.longMessage ?? passwordError.message);
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      setGlobalError(sendError.longMessage ?? sendError.message);
      return;
    }

    setAwaitingCode(true);
  }

  async function handleResend() {
    setGlobalError(null);
    setResent(false);
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }
    setResent(true);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }

    if (signUp.status === "complete") {
      // A redirect_url means they arrived from an invite link and are
      // joining an existing firm -- send them there. Otherwise /dashboard,
      // which prompts a brand-new account with no organization to create one
      // (see NoOrganizationState) -- there is no separate /onboarding route.
      const destination = searchParams.get("redirect_url") || "/dashboard";
      await signUp.finalize({
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
  }

  const formStyle = { display: "grid", gap: "14px" } as const;

  return (
    <AuthFrame title={t("@legalos.auth.signUp.title")}>
      {!awaitingCode ? (
        <form onSubmit={handleCreateAccount} style={formStyle}>
          {globalError && (
            <Alert type="danger" title={t("@legalos.auth.signUp.errorTitle")}>
              {globalError}
            </Alert>
          )}
          <Input
            label={t("@legalos.auth.signIn.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errorMessage={errors?.fields?.emailAddress?.message}
          />
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
            {t("@legalos.auth.signUp.continue")}
          </Button>
          {/* Same redirect_url hand-off as the sign-in page, in reverse. */}
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.signUp.haveAccount")}{" "}
            <Link
              href={withRedirect("/sign-in", searchParams.get("redirect_url"))}
              style={{ color: "var(--primary)", textDecoration: "underline" }}
            >
              {t("@legalos.auth.signUp.signIn")}
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerify} style={formStyle}>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.signUp.codeIntro", { email })}
          </p>
          {globalError && (
            <Alert type="danger" title={t("@legalos.auth.signUp.sendErrorTitle")}>
              {globalError}
            </Alert>
          )}
          {resent && !globalError && (
            <Alert type="info" title={t("@legalos.auth.code.resent")} />
          )}
          <Input
            label={t("@legalos.auth.code.label")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            errorMessage={errors?.fields?.code?.message}
          />
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
            onClick={handleResend}
            loading={busy}
          >
            {t("@legalos.auth.code.resend")}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
