"use client";

/**
 * Where an invitation link lands.
 *
 * The API has served /api/invites/{token} and .../accept since the org work,
 * and middleware.ts already lists "/invite(.*)" as public -- but no page ever
 * existed here, so every invitation email pointed at a 404. previewInvite()
 * and acceptInvite() in lib/api.ts were dead client code until this file.
 *
 * Two things this page has to get right:
 *
 * It is opened by someone with NO session -- that is the normal case, not the
 * edge one. So it previews the invitation before asking anyone to sign in: a
 * bare sign-in wall gives a recipient no reason to trust the link or any way
 * to see who sent it. The preview endpoint takes no auth for this reason.
 *
 * A spent invitation is not an error. Accepted, expired and revoked each get
 * their own sentence, because "something went wrong" sends the recipient back
 * to the person who invited them for no reason -- most often they simply
 * clicked the link twice.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { api, ApiError, type InvitationPreview } from "@/lib/api";
import { USING_CLERK } from "@/lib/auth-mode";

const ROLE_AR: Record<InvitationPreview["role"], string> = {
  lawyer: "محامٍ",
  staff: "سكرتير",
};

/** Each spent state says what actually happened and what to do about it. */
const SPENT_AR: Record<string, { title: string; body: string }> = {
  accepted: {
    title: "هذه الدعوة مُستخدَمة بالفعل",
    body: "انضممت إلى المكتب من قبل. سجّل الدخول للمتابعة.",
  },
  expired: {
    title: "انتهت صلاحية هذه الدعوة",
    body: "تنتهي الدعوة بعد سبعة أيام. اطلب من صاحب المكتب إرسال دعوة جديدة.",
  },
  revoked: {
    title: "أُلغيت هذه الدعوة",
    body: "لم تعد هذه الدعوة صالحة. تواصل مع صاحب المكتب.",
  },
};

export default function InvitePage() {
  // A build-time constant, so this branch is stable across every render of
  // this component -- useAuth() may only be called when ClerkProvider is
  // actually mounted (providers.tsx mounts it conditionally), and calling it
  // in dev-auth mode throws.
  return USING_CLERK ? <ClerkInvite /> : <Invite isSignedIn />;
}

function ClerkInvite() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <Invite isSignedIn={Boolean(isSignedIn)} />;
}

function Invite({ isSignedIn }: { isSignedIn: boolean }) {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .previewInvite(token)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((cause) => {
        if (cancelled) return;
        setLoadError(
          cause instanceof ApiError && cause.status === 404
            ? "هذا الرابط غير صحيح أو لم يعد موجودًا."
            : "تعذّر تحميل الدعوة. تحقّق من اتصالك ثم أعد المحاولة.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = useCallback(async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      await api.acceptInvite(token);
      router.push("/dashboard");
    } catch (cause) {
      setAcceptError(
        cause instanceof ApiError
          ? cause.message
          : "تعذّر قبول الدعوة. حاول مرة أخرى.",
      );
      setAccepting(false);
    }
  }, [token, router]);

  return (
    <div dir="rtl" style={{ maxWidth: 460, margin: "64px auto", padding: "0 20px" }}>
      <Heading level={1}>دعوة للانضمام</Heading>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding={4}>
          <Body
            preview={preview}
            loadError={loadError}
            isSignedIn={isSignedIn}
            token={token}
            accept={accept}
            accepting={accepting}
            acceptError={acceptError}
          />
        </Card>
      </div>
    </div>
  );
}

function Body({
  preview,
  loadError,
  isSignedIn,
  token,
  accept,
  accepting,
  acceptError,
}: {
  preview: InvitationPreview | null;
  loadError: string | null;
  isSignedIn: boolean;
  token: string;
  accept: () => void;
  accepting: boolean;
  acceptError: string | null;
}) {
  if (loadError) {
    return <Banner status="error" title="تعذّر فتح الدعوة" description={loadError} />;
  }
  if (!preview) {
    return <Text type="supporting">جارٍ التحميل…</Text>;
  }

  if (preview.status !== "pending") {
    const spent = SPENT_AR[preview.status] ?? {
      title: "هذه الدعوة غير صالحة",
      body: "تواصل مع صاحب المكتب للحصول على دعوة جديدة.",
    };
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <Banner status="info" title={spent.title} description={spent.body} />
        <Button
          label="الذهاب إلى تسجيل الدخول"
          variant="secondary"
          onClick={() => {
            window.location.href = "/sign-in";
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Text>
        {`تمت دعوتك للانضمام إلى ${preview.organization_name} بصفة ${
          ROLE_AR[preview.role] ?? preview.role
        }.`}
      </Text>
      {acceptError && (
        <Banner status="error" title="تعذّر قبول الدعوة" description={acceptError} />
      )}
      {isSignedIn ? (
        <Button
          label="قبول الدعوة"
          variant="primary"
          onClick={accept}
          isLoading={accepting}
        />
      ) : (
        <>
          <Text type="supporting">
            سجّل الدخول بالحساب المرتبط بهذا البريد لقبول الدعوة.
          </Text>
          <Button
            label="تسجيل الدخول للقبول"
            variant="primary"
            onClick={() => {
              // Back to this page after signing in -- the sign-in screen reads
              // redirect_url and finalizes there, so the recipient lands on the
              // accept button instead of a dashboard with no firm.
              window.location.href = `/sign-in?redirect_url=${encodeURIComponent(
                `/invite/${token}`,
              )}`;
            }}
          />
        </>
      )}
    </div>
  );
}
