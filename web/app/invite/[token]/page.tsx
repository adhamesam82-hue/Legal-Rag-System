"use client";

/**
 * شاشة قبول الدعوة في نظام السجل (LegalOS)
 * يعاد رسمها بالكامل على مكتبة مكونات السجل مع الحفاظ الصارم على منطق التحقق والاشتراك.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthFrame } from "@/components/AuthFrame";
import { api, ApiError, type InvitationPreview } from "@/lib/api";
import { useOrg } from "@/lib/org";
import { usingClerk } from "@/lib/auth-mode";

const ROLE_KEY: Record<InvitationPreview["role"], string> = {
  lawyer: "@legalos.auth.invite.role.lawyer",
  staff: "@legalos.auth.invite.role.staff",
};

/** حالات انتهاء صلاحية الدعوة أو استهلاكها */
const SPENT_KEY: Record<string, { title: string; body: string }> = {
  accepted: {
    title: "@legalos.auth.invite.accepted.title",
    body: "@legalos.auth.invite.accepted.body",
  },
  expired: {
    title: "@legalos.auth.invite.expired.title",
    body: "@legalos.auth.invite.expired.body",
  },
  revoked: {
    title: "@legalos.auth.invite.revoked.title",
    body: "@legalos.auth.invite.revoked.body",
  },
};

export default function InvitePage() {
  return usingClerk() ? <ClerkInvite /> : <Invite isSignedIn />;
}

function ClerkInvite() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <Invite isSignedIn={Boolean(isSignedIn)} />;
}

function Invite({ isSignedIn }: { isSignedIn: boolean }) {
  const t = useTranslator();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();
  const { setOrganizationId, reloadOrganizations } = useOrg();

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
            ? t("@legalos.auth.invite.notFound")
            : t("@legalos.auth.invite.loadFailed"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const accept = useCallback(async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const membership = await api.acceptInvite(token);
      setOrganizationId(membership.organization_id);
      reloadOrganizations();
      router.push("/dashboard");
    } catch (cause) {
      setAcceptError(
        cause instanceof ApiError ? cause.message : t("@legalos.auth.invite.acceptFailed"),
      );
      setAccepting(false);
    }
  }, [token, router, setOrganizationId, reloadOrganizations, t]);

  return (
    <AuthFrame title={t("@legalos.auth.invite.title")} width={460}>
      <Body
        preview={preview}
        loadError={loadError}
        isSignedIn={isSignedIn}
        token={token}
        accept={accept}
        accepting={accepting}
        acceptError={acceptError}
      />
    </AuthFrame>
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
  const t = useTranslator();

  if (loadError) {
    return (
      <Alert type="danger" title={t("@legalos.auth.invite.loadErrorTitle")}>
        {loadError}
      </Alert>
    );
  }
  if (!preview) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "var(--text3)" }}>
        {t("@legalos.auth.invite.loading")}
      </p>
    );
  }

  if (preview.status !== "pending") {
    const spent = SPENT_KEY[preview.status] ?? {
      title: "@legalos.auth.invite.invalid.title",
      body: "@legalos.auth.invite.invalid.body",
    };
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Alert type="info" title={t(spent.title)}>
          {t(spent.body)}
        </Alert>
        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = "/sign-in";
          }}
        >
          {t("@legalos.auth.invite.goToSignIn")}
        </Button>
      </div>
    );
  }

  const role = ROLE_KEY[preview.role] ? t(ROLE_KEY[preview.role]) : preview.role;

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text)", lineHeight: 1.6 }}>
        {t("@legalos.auth.invite.invited", { firm: preview.organization_name, role })}
      </p>
      {acceptError && (
        <Alert type="danger" title={t("@legalos.auth.invite.acceptErrorTitle")}>
          {acceptError}
        </Alert>
      )}
      {isSignedIn ? (
        <Button
          variant="primary"
          onClick={accept}
          loading={accepting}
        >
          {t("@legalos.auth.invite.accept")}
        </Button>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text3)", lineHeight: 1.5 }}>
            {t("@legalos.auth.invite.signInHint")}
          </p>
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = `/sign-in?redirect_url=${encodeURIComponent(
                `/invite/${token}`,
              )}`;
            }}
          >
            {t("@legalos.auth.invite.signInToAccept")}
          </Button>
        </>
      )}
    </div>
  );
}
