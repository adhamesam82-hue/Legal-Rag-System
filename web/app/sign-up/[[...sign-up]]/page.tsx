"use client";

import { Suspense, useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";

// Same reason as the sign-in page: useSearchParams() needs a Suspense
// boundary or `next build` fails.
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
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
      // joining an existing firm -- send them there, not to onboarding's
      // "create a firm" step, which is only for a brand-new account with
      // nowhere else to go.
      const destination = searchParams.get("redirect_url") || "/onboarding";
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

  return (
    <div dir="rtl" style={{ maxWidth: 420, margin: "64px auto", padding: "0 20px" }}>
      <Heading level={1}>إنشاء حساب</Heading>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding={4}>
          {!awaitingCode ? (
            <form
              onSubmit={handleCreateAccount}
              style={{ display: "grid", gap: 14 }}
            >
              {globalError && (
                <Banner status="error" title="تعذر إنشاء الحساب" description={globalError} />
              )}
              <TextInput
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
              />
              {errors?.fields?.emailAddress && (
                <Banner
                  status="error"
                  title="البريد الإلكتروني"
                  description={errors.fields.emailAddress.message}
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
                label="متابعة"
                variant="primary"
                isLoading={fetchStatus === "fetching"}
              />
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display: "grid", gap: 14 }}>
              <Text type="supporting">
                {`أرسلنا رمزًا إلى ${email}. أدخله أدناه لإكمال إنشاء حسابك.`}
              </Text>
              {globalError && (
                <Banner status="error" title="تعذر إرسال الرمز" description={globalError} />
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
