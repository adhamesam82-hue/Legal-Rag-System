"use client";

/**
 * The three states every data-backed screen has to render before it can show a
 * table: still loading, failed, or loaded-but-empty. Centralised so the
 * practice pillars stay consistent and none of them silently render an empty
 * table when the API is actually down.
 */

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

export function NoOrganizationState() {
  return (
    <EmptyState
      icon={<Icon icon={BuildingOffice2Icon} size="lg" color="secondary" />}
      title="No firm yet"
      description={
        "This account does not belong to a firm. Create one from Settings, " +
        "or seed the sample firm with: uv run python scripts/seed_demo_firm.py"
      }
    />
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
