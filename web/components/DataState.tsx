"use client";

/**
 * The three states every data-backed screen has to render before it can show a
 * table: still loading, failed, or loaded-but-empty. Centralised so the
 * practice pillars stay consistent and none of them silently render an empty
 * table when the API is actually down.
 */

import { useState } from "react";
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
import { api } from "@/lib/api";
import { useOrg } from "@/lib/org";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <HStack gap={3} vAlign="center" hAlign="center" padding={8}>
      <Spinner size="md" />
      <Text type="body" color="secondary">
        {label}
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
  return (
    <EmptyState
      icon={<Icon icon={ExclamationTriangleIcon} size="lg" color="secondary" />}
      title="Could not load this data"
      description={message}
      actions={
        onRetry ? (
          <Button label="Try again" variant="secondary" onClick={onRetry} />
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

  if (orgLoading) return <LoadingState label="Loading your firm…" />;
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
 */
export function NoOrganizationState() {
  const { reloadOrganizations } = useOrg();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createFirm() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createOrganization(name.trim());
      // The creator becomes the Owner server-side; refetch so every screen
      // picks the new firm up.
      reloadOrganizations();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not create the firm.");
      setSaving(false);
    }
  }

  return (
    <VStack gap={5} padding={8} hAlign="center">
      <EmptyState
        icon={<Icon icon={BuildingOffice2Icon} size="lg" color="secondary" />}
        title="Set up your firm"
        description="This account isn't part of a firm yet. Name it to get started — you'll be its Owner."
      />
      <VStack gap={3} width={360}>
        <InlineError message={error} onDismiss={() => setError(null)} />
        <TextInput
          label="Firm name"
          value={name}
          onChange={setName}
          placeholder="Al-Sayed & Partners"
          isRequired
        />
        <Button
          label={saving ? "Creating…" : "Create firm"}
          variant="primary"
          isDisabled={saving || !name.trim()}
          onClick={createFirm}
        />
        <Text type="supporting" color="secondary">
          To take over the seeded sample firm instead, run: uv run python
          scripts/seed_demo_firm.py --reset --owner-clerk-id &lt;your Clerk user id&gt;
        </Text>
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
