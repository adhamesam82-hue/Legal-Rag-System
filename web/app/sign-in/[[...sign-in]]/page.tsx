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
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";

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

function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Password verifying does not always mean the sign-in is done. On a new
  // device/browser Clerk requires an extra email-code check (its "Client
  // Trust" feature) before completing -- status comes back needs_client_trust
  // rather than complete, with no error. Skipping this leaves the sign-in
  // silently stuck: password accepted, nothing happens, no explanation.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [resent, setResent] = useState(false);
  // signIn.password() and friends return { error } rather than throwing;
  // without checking it, a rejected step leaves the button re-enabled with no
  // explanation, since errors.fields only covers per-field validation.
  const [globalError, setGlobalError] = useState<string | null>(null);

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

    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setGlobalError(sendError.longMessage ?? sendError.message);
        return;
      }
      setAwaitingCode(true);
      return;
    }

    // needs_new_password, needs_protect_check, etc. -- real Clerk states this
    // page has no flow for. Say so rather than leaving the form inert.
    setGlobalError(
      "يتطلب هذا الحساب خطوة تحقق إضافية غير مدعومة هنا حاليًا. يرجى التواصل مع الدعم.",
    );
  }

  async function handleResend() {
    setGlobalError(null);
    setResent(false);
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) {
      setGlobalError(error.longMessage ?? error.message);
      return;
    }
    setResent(true);
  }

  async function handleVerify(e: React.FormEvent) {
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

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 420,
        margin: "64px auto",
        padding: "0 20px",
      }}
    >
      <Heading level={1}>تسجيل الدخول</Heading>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding={4}>
          {!awaitingCode ? (
            <form
              onSubmit={handleSubmit}
              style={{ display: "grid", gap: 14 }}
            >
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
                isLoading={fetchStatus === "fetching"}
              />
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display: "grid", gap: 14 }}>
              <Text type="supporting">
                {`جهاز أو متصفح جديد -- أرسلنا رمزًا إلى ${email} لتأكيد هويتك.`}
              </Text>
              {globalError && (
                <Banner status="error" title="تعذر التحقق" description={globalError} />
              )}
              {resent && !globalError && (
                <Banner status="info" title="تم إرسال رمز جديد" />
              )}
              <TextInput
                label="رمز التحقق"
                value={code}
                onChange={setCode}
              />
              {errors?.fields?.code && (
                <Banner
                  status="error"
                  title="رمز التحقق"
                  description={errors.fields.code.message}
                />
              )}
              <Button
                type="submit"
                label="تحقق"
                variant="primary"
                isLoading={fetchStatus === "fetching"}
              />
              <Button
                type="button"
                label="إعادة إرسال الرمز"
                variant="ghost"
                onClick={handleResend}
                isLoading={fetchStatus === "fetching"}
              />
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
