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
import { useTranslator } from "@astryxdesign/core/i18n";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { AuthFrame } from "@/components/AuthFrame";
import { api, ApiError, type InvitationPreview } from "@/lib/api";
import { useOrg } from "@/lib/org";
import { usingClerk } from "@/lib/auth-mode";

const ROLE_KEY: Record<InvitationPreview["role"], string> = {
  lawyer: "@legalos.auth.invite.role.lawyer",
  staff: "@legalos.auth.invite.role.staff",
};

/** Each spent state says what actually happened and what to do about it. */
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
  // A build-time constant, so this branch is stable across every render of
  // this component -- useAuth() may only be called when ClerkProvider is
  // actually mounted (providers.tsx mounts it conditionally), and calling it
  // in dev-auth mode throws.
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
      // Bind the new firm before navigating, and refetch the membership list
      // behind it. Without the first of these the dashboard mounted while the
      // org context still held the pre-accept answer -- no memberships -- and
      // greeted a lawyer who had just joined a firm with "create your firm",
      // which corrected itself only on a manual reload.
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
      <Banner
        status="error"
        title={t("@legalos.auth.invite.loadErrorTitle")}
        description={loadError}
      />
    );
  }
  if (!preview) {
    return <Text type="supporting">{t("@legalos.auth.invite.loading")}</Text>;
  }

  if (preview.status !== "pending") {
    const spent = SPENT_KEY[preview.status] ?? {
      title: "@legalos.auth.invite.invalid.title",
      body: "@legalos.auth.invite.invalid.body",
    };
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <Banner status="info" title={t(spent.title)} description={t(spent.body)} />
        <Button
          label={t("@legalos.auth.invite.goToSignIn")}
          variant="secondary"
          onClick={() => {
            window.location.href = "/sign-in";
          }}
        />
      </div>
    );
  }

  const role = ROLE_KEY[preview.role] ? t(ROLE_KEY[preview.role]) : preview.role;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Text>{t("@legalos.auth.invite.invited", { firm: preview.organization_name, role })}</Text>
      {acceptError && (
        <Banner
          status="error"
          title={t("@legalos.auth.invite.acceptErrorTitle")}
          description={acceptError}
        />
      )}
      {isSignedIn ? (
        <Button
          label={t("@legalos.auth.invite.accept")}
          variant="primary"
          onClick={accept}
          isLoading={accepting}
        />
      ) : (
        <>
          <Text type="supporting">{t("@legalos.auth.invite.signInHint")}</Text>
          <Button
            label={t("@legalos.auth.invite.signInToAccept")}
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
