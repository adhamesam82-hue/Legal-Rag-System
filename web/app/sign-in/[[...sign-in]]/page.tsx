"use client";

import { Suspense, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
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

function SignInForm() {
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
    // standalone legal-research chat, not organization-aware; /dashboard is
    // where a firm member actually lands.
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
    setGlobalError(
      "يتطلب هذا الحساب خطوة تحقق إضافية غير مدعومة هنا حاليًا. يرجى التواصل مع الدعم.",
    );
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
      setGlobalError("تعذر إكمال تسجيل الدخول. يرجى المحاولة مرة أخرى.");
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
      setGlobalError("تعذر التحقق من الرمز. يرجى المحاولة مرة أخرى.");
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
      setGlobalError("تعذر حفظ كلمة المرور الجديدة. يرجى المحاولة مرة أخرى.");
    }
  }

  // ---------------------------------------------------------------- render

  const heading: Record<Step, string> = {
    password: "تسجيل الدخول",
    clientTrust: "تسجيل الدخول",
    resetEmail: "استعادة كلمة المرور",
    resetCode: "استعادة كلمة المرور",
    resetPassword: "كلمة مرور جديدة",
  };

  const codeField = (
    <>
      <TextInput label="رمز التحقق" value={code} onChange={setCode} />
      {errors?.fields?.code && (
        <Banner status="error" title="رمز التحقق" description={errors.fields.code.message} />
      )}
    </>
  );

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 420,
        margin: "64px auto",
        padding: "0 20px",
      }}
    >
      <Heading level={1}>{heading[step]}</Heading>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding={4}>
          {step === "password" && (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              {globalError && (
                <Banner status="error" title="تعذر تسجيل الدخول" description={globalError} />
              )}
              <TextInput
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
              />
              {errors?.fields?.identifier && (
                <Banner
                  status="error"
                  title="البريد الإلكتروني"
                  description={errors.fields.identifier.message}
                />
              )}
              <TextInput
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={setPassword}
              />
              {errors?.fields?.password && (
                <Banner
                  status="error"
                  title="كلمة المرور"
                  description={errors.fields.password.message}
                />
              )}
              <Button
                type="submit"
                label="تسجيل الدخول"
                variant="primary"
                isLoading={busy}
              />
              <Button
                type="button"
                label="نسيت كلمة المرور؟"
                variant="ghost"
                onClick={() => go("resetEmail")}
              />
              {/* The only door to sign-up from inside the app. redirect_url
                  travels with it: someone who arrived from an invitation link
                  and turns out not to have an account must come back to that
                  invitation after signing up, not land on "create your firm"
                  for a firm that already exists. */}
              <Text type="supporting">
                ليس لديك حساب؟{" "}
                <Link href={withRedirect("/sign-up", searchParams.get("redirect_url"))}>
                  أنشئ حساب مكتبك
                </Link>
              </Text>
            </form>
          )}

          {step === "clientTrust" && (
            <form onSubmit={handleVerifyTrustCode} style={{ display: "grid", gap: 14 }}>
              <Text type="supporting">
                {`جهاز أو متصفح جديد -- أرسلنا رمزًا إلى ${email} لتأكيد هويتك.`}
              </Text>
              {globalError && (
                <Banner status="error" title="تعذر التحقق" description={globalError} />
              )}
              {resent && !globalError && <Banner status="info" title="تم إرسال رمز جديد" />}
              {codeField}
              <Button type="submit" label="تحقق" variant="primary" isLoading={busy} />
              <Button
                type="button"
                label="إعادة إرسال الرمز"
                variant="ghost"
                onClick={handleResendTrustCode}
                isLoading={busy}
              />
            </form>
          )}

          {step === "resetEmail" && (
            <form onSubmit={handleRequestReset} style={{ display: "grid", gap: 14 }}>
              <Text type="supporting">
                أدخل بريدك الإلكتروني وسنرسل إليه رمزًا لتعيين كلمة مرور جديدة.
              </Text>
              {globalError && (
                <Banner status="error" title="تعذر إرسال الرمز" description={globalError} />
              )}
              <TextInput
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
              />
              {errors?.fields?.identifier && (
                <Banner
                  status="error"
                  title="البريد الإلكتروني"
                  description={errors.fields.identifier.message}
                />
              )}
              <Button type="submit" label="إرسال الرمز" variant="primary" isLoading={busy} />
              <Button
                type="button"
                label="العودة إلى تسجيل الدخول"
                variant="ghost"
                onClick={() => go("password")}
              />
            </form>
          )}

          {step === "resetCode" && (
            <form onSubmit={handleVerifyResetCode} style={{ display: "grid", gap: 14 }}>
              {/* Deliberately the same sentence whether or not the address
                  exists. See sendResetCode(). */}
              <Text type="supporting">
                {`إن كان ${email} مسجّلًا لدينا فقد أرسلنا إليه رمزًا. أدخله أدناه.`}
              </Text>
              {globalError && (
                <Banner status="error" title="تعذر التحقق" description={globalError} />
              )}
              {resent && !globalError && <Banner status="info" title="تم إرسال رمز جديد" />}
              {codeField}
              <Button type="submit" label="تحقق" variant="primary" isLoading={busy} />
              <Button
                type="button"
                label="إعادة إرسال الرمز"
                variant="ghost"
                onClick={handleResendResetCode}
                isLoading={busy}
              />
              <Button
                type="button"
                label="تغيير البريد الإلكتروني"
                variant="ghost"
                onClick={() => go("resetEmail")}
              />
            </form>
          )}

          {step === "resetPassword" && (
            <form onSubmit={handleSubmitNewPassword} style={{ display: "grid", gap: 14 }}>
              <Text type="supporting">
                اختر كلمة مرور جديدة. ستُغلق الجلسات المفتوحة على الأجهزة الأخرى.
              </Text>
              {globalError && (
                <Banner status="error" title="تعذر حفظ كلمة المرور" description={globalError} />
              )}
              <TextInput
                label="كلمة المرور الجديدة"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
              />
              {errors?.fields?.password && (
                <Banner
                  status="error"
                  title="كلمة المرور"
                  description={errors.fields.password.message}
                />
              )}
              <Button
                type="submit"
                label="حفظ والدخول"
                variant="primary"
                isLoading={busy}
              />
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
