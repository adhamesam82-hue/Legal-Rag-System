"use client";

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg } from "@/lib/org";
import { LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Divider } from "@astryxdesign/core/Divider";
import { Avatar } from "@astryxdesign/core/Avatar";

export default function FirmSettingsPage() {
  const t = useTranslator();
  const { organizationName } = useOrg();
  const [name, setName] = useState("السيد وشركاه للمحاماة والاستشارات القانونية");
  const [registrationNumber, setRegistrationNumber] = useState("س.ت 4821 لسنة 2019");
  const [phone, setPhone] = useState("+20 2 2735 1190");
  const [address, setAddress] = useState(
    "14 شارع طلعت حرب، وسط البلد\nالقاهرة، مصر",
  );
  const [logo, setLogo] = useState<File | null>(null);

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={4}>{t("@legalos.settings.firm.heading")}</Heading>
        <Text type="body" color="secondary">
          {t("@legalos.settings.firm.subtitle", { firm: organizationName ?? name })}
        </Text>
      </VStack>

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
            value={logo}
            onChange={(files) => setLogo(Array.isArray(files) ? (files[0] ?? null) : files)}
            accept="image/png,image/jpeg,image/svg+xml"
            mode="dropzone"
            placeholder={t("@legalos.settings.firm.logoPlaceholder")}
            description={t("@legalos.settings.firm.logoHint")}
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
            isRequired
          />
          <TextInput
            label={t("@legalos.settings.firm.registrationLabel")}
            value={registrationNumber}
            onChange={setRegistrationNumber}
            description={t("@legalos.settings.firm.registrationHint")}
          />
          <TextInput
            label={t("@legalos.settings.firm.phoneLabel")}
            value={phone}
            onChange={setPhone}
            type="text"
          />
          <TextArea
            label={t("@legalos.settings.firm.addressLabel")}
            value={address}
            onChange={setAddress}
            rows={3}
          />
        </VStack>
      </Card>

      <LayoutFooter hasDivider>
        <HStack gap={2} hAlign="end">
          <Button label={t("@legalos.settings.action.cancel")} variant="secondary">
            {t("@legalos.settings.action.cancel")}
          </Button>
          <Button label={t("@legalos.settings.action.saveChanges")} variant="primary">
            {t("@legalos.settings.action.saveChanges")}
          </Button>
        </HStack>
      </LayoutFooter>
    </VStack>
  );
}
