"use client";

/**
 * The three states every data-backed screen has to render before it can show a
 * table: still loading, failed, or loaded-but-empty. Centralised so the
 * practice pillars stay consistent and none of them silently render an empty
 * table when the API is actually down.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Banner } from "@astryxdesign/core/Banner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { api, type Plans } from "@/lib/api";
import { useOrg } from "@/lib/org";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { MATTER_TYPES, type MatterType } from "@/lib/practice";

export function LoadingState({ label }: { label?: string }) {
  const t = useTranslator();
  return (
    <HStack gap={3} vAlign="center" hAlign="center" padding={8}>
      <Spinner size="md" />
      <Text type="body" color="secondary">
        {label ?? t("@legalos.common.loading")}
      </Text>
    </HStack>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const t = useTranslator();
  return (
    <EmptyState
      icon={<Icon icon={ExclamationTriangleIcon} size="lg" color="secondary" />}
      title={t("@legalos.common.errorTitle")}
      // API/server messages arrive in English regardless of interface
      // language. Wrapped in a Unicode bidi isolate (FSI…PDI) because on an
      // RTL page an unisolated Latin string throws its trailing punctuation
      // to the wrong end — "...:8000?" renders as "?...:8000". The prop is a
      // plain string, so this has to be done in the text, not with dir="".
      description={`⁨${message}⁩`}
      actions={
        onRetry ? (
          <Button label={t("@legalos.common.tryAgain")} variant="secondary" onClick={onRetry} />
        ) : undefined
      }
    />
  );
}

/**
 * Wraps a data-backed section. Renders the loading, error and no-organization
 * states; otherwise hands the loaded value to `children`.
 *
 * `data` being null after loading means the org has no firm yet, which is a
 * different situation from an empty list -- the page's own empty state handles
 * the latter.
 */
export function DataView<T>({
  resource,
  children,
  loadingLabel,
}: {
  resource: { data: T | null; loading: boolean; error: string | null; reload: () => void };
  children: (data: T) => React.ReactNode;
  loadingLabel?: string;
}) {
  const { organizationId, loading: orgLoading, error: orgError } = useOrg();
  const t = useTranslator();

  // Only wait on the membership check while there is no organization to work
  // with. Once one is bound -- including the provisional id restored from the
  // last session -- this screen's own request is already in flight, and
  // blocking on /api/orgs/me here would hold its result behind a round-trip
  // that has nothing left to contribute to what is being rendered.
  if (orgLoading && organizationId === null) {
    return <LoadingState label={t("@legalos.common.loadingFirm")} />;
  }
  if (orgError) return <ErrorState message={orgError} />;
  if (organizationId === null) return <NoOrganizationState />;
  if (resource.loading && resource.data === null) {
    return <LoadingState label={loadingLabel} />;
  }
  if (resource.error) {
    return <ErrorState message={resource.error} onRetry={resource.reload} />;
  }
  if (resource.data === null) return <LoadingState label={loadingLabel} />;
  return <>{children(resource.data)}</>;
}

/**
 * Shown when the signed-in account belongs to no organization — the state a
 * brand-new Clerk sign-up lands in. It creates the firm inline rather than
 * pointing elsewhere: this is the only route out, so a dead end here would
 * strand the account with no way into the product.
 *
 * Two fields, not a form (T-040): the name, and the practice areas that make
 * the first screen after sign-in mean something -- matter-type suggestions
 * and the distribution reports start from them. Specialties are optional and
 * the screen says the rest lives in Settings; the name alone still works.
 */
export function NoOrganizationState() {
  const { reloadOrganizations } = useOrg();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  // The trial length is a deployment setting (LEGALOS_TRIAL_DAYS), not a
  // number baked into this screen -- see api.plans() and T-041. Fetched
  // directly rather than through useResource: that hook only runs once an
  // organization is bound, and this screen exists precisely because one
  // isn't yet.
  const [plans, setPlans] = useState<Plans | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.plans().then((result) => !cancelled && setPlans(result)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [name, setName] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createFirm() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createOrganization(name.trim(), specialties as MatterType[]);
      // The creator becomes the Owner server-side; refetch so every screen
      // picks the new firm up.
      reloadOrganizations();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.common.noOrg.createFailed"));
      setSaving(false);
    }
  }

  return (
    <VStack gap={5} padding={8} hAlign="center">
      <EmptyState
        icon={<Icon icon={BuildingOffice2Icon} size="lg" color="secondary" />}
        title={t("@legalos.common.noOrg.title")}
        description={t("@legalos.common.noOrg.description")}
      />
      <VStack gap={3} width={360}>
        <InlineError message={error} onDismiss={() => setError(null)} />
        <TextInput
          label={t("@legalos.common.noOrg.firmNameLabel")}
          value={name}
          onChange={setName}
          placeholder={t("@legalos.common.noOrg.firmNamePlaceholder")}
          isRequired
        />
        <MultiSelector
          label={t("@legalos.common.noOrg.specialtiesLabel")}
          description={t("@legalos.common.noOrg.specialtiesHint")}
          isOptional
          value={specialties}
          onChange={setSpecialties}
          placeholder={t("@legalos.common.noOrg.specialtiesPlaceholder")}
          options={MATTER_TYPES.map((value) => ({ value, label: enumLabel(value) }))}
          hasSearch
          maxBadges={3}
        />
        <Button
          label={saving ? t("@legalos.common.noOrg.creating") : t("@legalos.common.noOrg.createFirm")}
          variant="primary"
          isDisabled={saving || !name.trim()}
          onClick={createFirm}
        />
        {plans && (
          <Text type="supporting" color="secondary">
            {t("@legalos.common.noOrg.trialLine", { days: plans.trial_days })}
          </Text>
        )}
        <Text type="supporting" color="secondary">
          {t("@legalos.common.noOrg.settingsHint")}
        </Text>
        {/* No shell command here, in any mode. The seeded demo firm is a
            developer's tool and lives in docs/onboarding.md; a string in the
            catalog would still ship in the production bundle even behind a
            dev-mode check. */}
      </VStack>
    </VStack>
  );
}

/** Inline banner for a failed write, where the page itself still renders. */
export function InlineError({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <Banner
      status="error"
      title={message}
      isDismissable={Boolean(onDismiss)}
      onDismiss={onDismiss}
    />
  );
}

export function EmptyRows({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  actions?: React.ReactNode;
}) {
  return (
    <VStack padding={6}>
      <EmptyState
        icon={<Icon icon={icon} size="lg" color="secondary" />}
        title={title}
        description={description}
        actions={actions}
      />
    </VStack>
  );
}
