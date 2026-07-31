"use client";

import { Suspense, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";

// useSearchParams() in a Client Component requires a Suspense boundary --
// without one, `next build` fails outright (it has no way to prerender a
// static shell around request-time query data). The default export below
// is the boundary; this inner component is what actually reads the param.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn.password({ emailAddress: email, password });

    if (signIn.status === "complete") {
      // OrgGate and the invite-accept page both send visitors here with a
      // redirect_url when they need to sign in first -- honor it so they
      // land back where they were going, not always at "/".
      const destination = searchParams.get("redirect_url") || "/";
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
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 14 }}
          >
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
        </Card>
      </div>
    </div>
  );
}
