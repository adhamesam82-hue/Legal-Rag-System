"use client";

/**
 * The firm's own details.
 *
 * This screen used to be four inputs seeded with one hardcoded Cairo firm and
 * a Save button wired to nothing: pressing it issued no request at all, gave
 * no feedback, and the old values came back on reload — while the avatar in
 * the header re-lettered itself from the new name, so it looked like it had
 * worked. There was no update endpoint and no columns behind three of the
 * four fields; both exist now (migration 0018, PATCH /api/orgs/{id}).
 *
 * The logo picker stays, disabled, and says why: there are no uploads for it
 * to write to yet. A control that opens a file dialog and drops the file is
 * the same lie in a smaller box.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useResource } from "@/lib/org";
import { api, ApiError, type Organization } from "@/lib/api";
import { DataView, InlineError } from "@/components/DataState";
import { LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Divider } from "@astryxdesign/core/Divider";
import { Avatar } from "@astryxdesign/core/Avatar";

export default function FirmSettingsPage() {
  const { organizationId, organizationName, role, reloadOrganizations } = useOrg();

  // Never called before an organization is bound: useResource holds the
  // fetcher until one is, which is the same guarantee every practice screen
  // relies on.
  const firm = useResource(() => api.organization(organizationId!), [
    organizationId,
  ]);

  return (
    <DataView resource={firm}>
      {(loaded) => (
        <FirmSettingsForm
          key={loaded.id}
          firm={loaded}
          organizationId={loaded.id}
          canEdit={role === "owner"}
          onSaved={() => {
            // The name is on every screen's header and in the sidebar, both
            // of which read it from the membership list rather than from
            // here, so a rename that stopped at this form would look like it
            // had not taken.
            firm.reload();
            reloadOrganizations();
          }}
          fallbackName={organizationName ?? ""}
        />
      )}
    </DataView>
  );
}

function FirmSettingsForm({
  firm,
  organizationId,
  canEdit,
  onSaved,
  fallbackName,
}: {
  firm: Organization;
  organizationId: number;
  canEdit: boolean;
  onSaved: () => void;
  fallbackName: string;
}) {
  const t = useTranslator();
  const [name, setName] = useState(firm.name);
  const [registrationNumber, setRegistrationNumber] = useState(
    firm.registration_number ?? "",
  );
  const [phone, setPhone] = useState(firm.phone ?? "");
  const [address, setAddress] = useState(firm.address ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-seed the inputs whenever the record behind them changes -- after a save
  // reloads it, or when the firm switcher moves to another firm.
  useEffect(() => {
    setName(firm.name);
    setRegistrationNumber(firm.registration_number ?? "");
    setPhone(firm.phone ?? "");
    setAddress(firm.address ?? "");
  }, [firm]);

  const dirty =
    name !== firm.name ||
    registrationNumber !== (firm.registration_number ?? "") ||
    phone !== (firm.phone ?? "") ||
    address !== (firm.address ?? "");

  function discard() {
    setName(firm.name);
    setRegistrationNumber(firm.registration_number ?? "");
    setPhone(firm.phone ?? "");
    setAddress(firm.address ?? "");
    setError(null);
    setSaved(false);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateOrganization(organizationId, {
        name: name.trim(),
        registration_number: registrationNumber,
        phone,
        address,
      });
      setSaved(true);
      onSaved();
    } catch (exc) {
      setError(
        exc instanceof ApiError
          ? exc.message
          : t("@legalos.settings.firm.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={4}>{t("@legalos.settings.firm.heading")}</Heading>
        <Text type="body" color="secondary">
          {t("@legalos.settings.firm.subtitle", { firm: firm.name || fallbackName })}
        </Text>
      </VStack>

      <InlineError message={error} onDismiss={() => setError(null)} />
      {saved && !dirty && (
        <Banner
          status="success"
          title={t("@legalos.settings.firm.saved")}
          isDismissable
          onDismiss={() => setSaved(false)}
        />
      )}
      {!canEdit && (
        <Banner
          status="info"
          title={t("@legalos.settings.firm.ownerOnly")}
        />
      )}

      <Card>
        <VStack gap={4}>
          <HStack gap={4} vAlign="center">
            <Avatar name={name} size="lg" tooltip={false} />
            <VStack gap={0.5}>
              <Text type="label" weight="semibold">
                {t("@legalos.settings.firm.logoHeading")}
              </Text>
              <Text type="supporting" color="secondary">
                {t("@legalos.settings.firm.logoDescription")}
              </Text>
            </VStack>
          </HStack>
          <FileInput
            label={t("@legalos.settings.firm.uploadLogo")}
            isLabelHidden
            value={null}
            onChange={() => {}}
            accept="image/png,image/jpeg,image/svg+xml"
            mode="dropzone"
            isDisabled
            placeholder={t("@legalos.settings.firm.logoPlaceholder")}
            // Says what it cannot do instead of accepting a file and dropping
            // it: there is nowhere to store a logo yet.
            description={t("@legalos.settings.firm.logoUnavailable")}
          />
        </VStack>
      </Card>

      <Card>
        <VStack gap={4}>
          <Text type="label" weight="semibold">
            {t("@legalos.settings.firm.detailsHeading")}
          </Text>
          <Divider />
          <TextInput
            label={t("@legalos.settings.firm.nameLabel")}
            value={name}
            onChange={setName}
            isDisabled={!canEdit || saving}
            isRequired
          />
          <TextInput
            label={t("@legalos.settings.firm.registrationLabel")}
            value={registrationNumber}
            onChange={setRegistrationNumber}
            isDisabled={!canEdit || saving}
            description={t("@legalos.settings.firm.registrationHint")}
          />
          <TextInput
            label={t("@legalos.settings.firm.phoneLabel")}
            value={phone}
            onChange={setPhone}
            isDisabled={!canEdit || saving}
            type="text"
          />
          <TextArea
            label={t("@legalos.settings.firm.addressLabel")}
            value={address}
            onChange={setAddress}
            isDisabled={!canEdit || saving}
            rows={3}
          />
        </VStack>
      </Card>

      {canEdit && (
        <LayoutFooter hasDivider>
          <HStack gap={2} hAlign="end">
            <Button
              label={t("@legalos.settings.action.cancel")}
              variant="secondary"
              isDisabled={saving || !dirty}
              onClick={discard}
            >
              {t("@legalos.settings.action.cancel")}
            </Button>
            <Button
              label={
                saving
                  ? t("@legalos.settings.firm.saving")
                  : t("@legalos.settings.action.saveChanges")
              }
              variant="primary"
              isDisabled={saving || !dirty || !name.trim()}
              onClick={save}
            >
              {saving
                ? t("@legalos.settings.firm.saving")
                : t("@legalos.settings.action.saveChanges")}
            </Button>
          </HStack>
        </LayoutFooter>
      )}
    </VStack>
  );
}
