"use client";

import { useState } from "react";
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
  const [name, setName] = useState("Al-Sayed & Partners");
  const [registrationNumber, setRegistrationNumber] = useState("CR-2019-004821");
  const [phone, setPhone] = useState("+20 2 2735 1190");
  const [address, setAddress] = useState(
    "14 Talaat Harb Street, Downtown\nCairo, Egypt",
  );
  const [logo, setLogo] = useState<File | null>(null);

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={4}>Firm settings</Heading>
        <Text type="body" color="secondary">
          General information about Al-Sayed &amp; Partners. Visible to every member of
          the firm.
        </Text>
      </VStack>

      <Card>
        <VStack gap={4}>
          <HStack gap={4} vAlign="center">
            <Avatar name={name} size="lg" tooltip={false} />
            <VStack gap={0.5}>
              <Text type="label" weight="semibold">
                Firm logo
              </Text>
              <Text type="supporting" color="secondary">
                Shown on invoices, generated documents, and the sidebar.
              </Text>
            </VStack>
          </HStack>
          <FileInput
            label="Upload logo"
            isLabelHidden
            value={logo}
            onChange={(files) => setLogo(Array.isArray(files) ? (files[0] ?? null) : files)}
            accept="image/png,image/jpeg,image/svg+xml"
            mode="dropzone"
            placeholder="Drag a logo here, or click to browse"
            description="PNG, JPG, or SVG. Recommended 512×512px, up to 2MB."
          />
        </VStack>
      </Card>

      <Card>
        <VStack gap={4}>
          <Text type="label" weight="semibold">
            Firm details
          </Text>
          <Divider />
          <TextInput label="Firm name" value={name} onChange={setName} isRequired />
          <TextInput
            label="Commercial registration number"
            value={registrationNumber}
            onChange={setRegistrationNumber}
            description="As registered with the Egyptian Commercial Registry."
          />
          <TextInput label="Phone" value={phone} onChange={setPhone} type="text" />
          <TextArea
            label="Address"
            value={address}
            onChange={setAddress}
            rows={3}
          />
        </VStack>
      </Card>

      <LayoutFooter hasDivider>
        <HStack gap={2} hAlign="end">
          <Button label="Cancel" variant="secondary">
            Cancel
          </Button>
          <Button label="Save changes" variant="primary">
            Save changes
          </Button>
        </HStack>
      </LayoutFooter>
    </VStack>
  );
}
