"use client";

import { use, useState } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { TextArea } from "@astryxdesign/core/TextArea";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  SparklesIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ClockIcon,
  LockClosedIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ScaleIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import {
  getDocument,
  folderLabel,
  DOCUMENT_VERSIONS,
  DOCUMENT_COMMENTS,
  type DocumentComment,
} from "../data";

const AI_ICON_CLASS = "text-purple-vivid";

const DEFAULT_PREVIEW_SECTIONS = [
  {
    title: "1. Parties",
    body: "This agreement is entered into between Al-Sayed & Partners' client and the counterparty named on the signature page below.",
  },
  {
    title: "2. Definitions",
    body: "Terms used throughout this document carry the meanings assigned to them in this section, unless the context requires otherwise.",
  },
  {
    title: "3. Term & Termination",
    body: "This agreement remains in effect from the execution date until terminated in accordance with the provisions set out below.",
  },
  {
    title: "4. Confidentiality Obligations",
    body: "Each party agrees to protect confidential information disclosed under this agreement using no less than reasonable care.",
  },
  {
    title: "5. Governing Law",
    body: "This agreement is governed by the laws of the Arab Republic of Egypt, without regard to conflict-of-law principles.",
  },
];

function DocumentPreview({ name }: { name: string }) {
  return (
    <Card padding={8}>
      <VStack gap={5}>
        <HStack hAlign="between" vAlign="center">
          <Text type="label" weight="semibold" color="secondary">
            AL-SAYED &amp; PARTNERS
          </Text>
          <Text type="supporting" color="secondary">
            Page 1 of 4 · Preview
          </Text>
        </HStack>
        <Divider />
        <VStack gap={1}>
          <Heading level={4}>{name}</Heading>
          <Text type="supporting" color="secondary">
            Document preview — formatting is illustrative only
          </Text>
        </VStack>
        <VStack gap={4}>
          {DEFAULT_PREVIEW_SECTIONS.map((section) => (
            <VStack key={section.title} gap={1}>
              <Text type="label" weight="semibold">
                {section.title}
              </Text>
              <Text type="body" color="secondary">
                {section.body}
              </Text>
            </VStack>
          ))}
        </VStack>
      </VStack>
    </Card>
  );
}

function SharingList({ sharing, sharedWithCount }: { sharing: string; sharedWithCount?: number }) {
  const team = ["Ahmed Al-Sayed", "Mona Farouk", "Youssef Adel", "Layla Hassan"];
  if (sharing === "firm-wide") {
    return (
      <List hasDividers density="compact">
        <ListItem
          label="All firm members"
          description="Can view"
          startContent={<Icon icon={GlobeAltIcon} size="sm" color="secondary" />}
        />
      </List>
    );
  }
  if (sharing === "shared") {
    const members = team.slice(0, (sharedWithCount ?? 1) + 1);
    return (
      <List hasDividers density="compact">
        {members.map((name, i) => (
          <ListItem
            key={name}
            label={name}
            description={i === 0 ? "Owner · Can edit" : "Can edit"}
            startContent={<Avatar name={name} size="xsm" tooltip={false} />}
          />
        ))}
      </List>
    );
  }
  return (
    <List hasDividers density="compact">
      <ListItem
        label="Ahmed Al-Sayed"
        description="Owner · Can edit"
        startContent={<Avatar name="Ahmed Al-Sayed" size="xsm" tooltip={false} />}
      />
    </List>
  );
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const doc = getDocument(id);

  const initialComments = DOCUMENT_COMMENTS[id] ?? [];
  const [comments, setComments] = useState<DocumentComment[]>(initialComments);
  const [draft, setDraft] = useState("");

  if (!doc) {
    return (
      <Layout
        height="fill"
        content={
          <LayoutContent padding={0}>
            <EmptyState
              icon={<Icon icon={DocumentIcon} size="lg" color="secondary" />}
              title="Document not found"
              description="This document may have been moved or the link is out of date."
              actions={
                <Link href="/documents" isStandalone>
                  Back to Documents
                </Link>
              }
            />
          </LayoutContent>
        }
      />
    );
  }

  const versions = DOCUMENT_VERSIONS[id] ?? [
    {
      version: 1,
      label: "Version 1 (current)",
      uploadedBy: doc.uploadedBy,
      date: doc.modified,
      sizeLabel: doc.sizeLabel,
    },
  ];

  const clientName = folderLabel(doc.folder);

  function postComment() {
    if (!draft.trim()) return;
    setComments((prev) => [
      ...prev,
      { id: `local-${prev.length + 1}`, author: "Ahmed Al-Sayed", text: draft.trim(), time: "Just now" },
    ]);
    setDraft("");
  }

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <VStack gap={4}>
              <Breadcrumbs variant="supporting">
                <BreadcrumbItem href="/documents">Documents</BreadcrumbItem>
                <BreadcrumbItem href="/documents">{folderLabel(doc.folder)}</BreadcrumbItem>
                <BreadcrumbItem isCurrent>{doc.name}</BreadcrumbItem>
              </Breadcrumbs>

              <HStack hAlign="between" vAlign="start">
                <VStack gap={2}>
                  <Heading level={2}>{doc.name}</Heading>
                  <HStack gap={2} vAlign="center">
                    {doc.hasAiSummary && (
                      <Badge
                        variant="purple"
                        label="AI summary"
                        icon={<Icon icon={SparklesIcon} size="xsm" />}
                      />
                    )}
                    {doc.ocrStatus === "complete" && (
                      <Badge
                        variant="success"
                        label="OCR complete"
                        icon={<Icon icon={CheckCircleIcon} size="xsm" />}
                      />
                    )}
                    {doc.ocrStatus === "processing" && (
                      <Badge
                        variant="warning"
                        label="OCR processing"
                        icon={<Icon icon={ArrowPathIcon} size="xsm" />}
                      />
                    )}
                    <Text type="supporting" color="secondary">
                      {doc.sizeLabel} · Modified {doc.modified}
                    </Text>
                  </HStack>
                </VStack>
                <HStack gap={2}>
                  <Button
                    label="Share document"
                    variant="secondary"
                    icon={<Icon icon={ShareIcon} size="sm" color="inherit" />}
                  >
                    Share
                  </Button>
                  <Button
                    label="Download document"
                    variant="primary"
                    icon={<Icon icon={ArrowDownTrayIcon} size="sm" color="inherit" />}
                  >
                    Download
                  </Button>
                </HStack>
              </HStack>
            </VStack>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <VStack gap={6}>
                  <DocumentPreview name={doc.name} />

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>Version history</Heading>
                      <List hasDividers density="compact">
                        {versions.map((v) => (
                          <ListItem
                            key={v.version}
                            label={v.label}
                            description={`${v.uploadedBy} · ${v.date} · ${v.sizeLabel}${v.note ? ` — ${v.note}` : ""}`}
                            startContent={<Icon icon={ClockIcon} size="sm" color="secondary" />}
                            endContent={
                              <Button
                                label={`Download ${v.label}`}
                                variant="ghost"
                                size="sm"
                                isIconOnly
                                icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
                              />
                            }
                          />
                        ))}
                      </List>
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>Comments</Heading>
                      {comments.length > 0 ? (
                        <List hasDividers density="compact">
                          {comments.map((c) => (
                            <ListItem
                              key={c.id}
                              label={c.author}
                              description={c.text}
                              startContent={<Avatar name={c.author} size="sm" tooltip={false} />}
                              endContent={
                                <Text type="supporting" color="secondary">
                                  {c.time}
                                </Text>
                              }
                            />
                          ))}
                        </List>
                      ) : (
                        <Text type="body" color="secondary">
                          No comments yet.
                        </Text>
                      )}
                      <Divider />
                      <VStack gap={2}>
                        <TextArea
                          label="Add a comment"
                          isLabelHidden
                          value={draft}
                          onChange={setDraft}
                          placeholder="Add a comment for the team…"
                          rows={2}
                        />
                        <HStack hAlign="end">
                          <Button
                            label="Post comment"
                            variant="primary"
                            size="sm"
                            isDisabled={!draft.trim()}
                            onClick={postComment}
                          >
                            Post comment
                          </Button>
                        </HStack>
                      </VStack>
                    </VStack>
                  </Card>
                </VStack>
              </GridSpan>

              <VStack gap={6}>
                {doc.hasAiSummary && (
                  <Card variant="purple">
                    <VStack gap={3}>
                      <HStack gap={2} vAlign="center">
                        <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                        <Heading level={4}>AI summary</Heading>
                      </HStack>
                      <Text type="body">
                        A confidentiality agreement covering the standard obligations, term, and
                        governing law clauses. Two clauses deviate from your standard NDA
                        template: the non-compete scope is broader than usual, and the
                        confidentiality term runs 5 years instead of the firm&apos;s default 3.
                      </Text>
                      <Divider />
                      <HStack gap={2} vAlign="center">
                        <Icon icon={ExclamationTriangleIcon} size="xsm" color="warning" />
                        <Text type="supporting">2 clauses flagged for review</Text>
                      </HStack>
                      <Link href="/ai-assistant" isStandalone>
                        Open in AI Assistant
                      </Link>
                    </VStack>
                  </Card>
                )}

                <Card>
                  <VStack gap={3}>
                    <Heading level={4}>Related matters</Heading>
                    <List hasDividers density="compact">
                      {doc.matter && (
                        <ListItem
                          label={doc.matter}
                          description="View matter"
                          href="/matters"
                          startContent={<Icon icon={ScaleIcon} size="sm" color="secondary" />}
                        />
                      )}
                      <ListItem
                        label={clientName}
                        description="View client"
                        href="/clients"
                        startContent={<Icon icon={BuildingOffice2Icon} size="sm" color="secondary" />}
                      />
                    </List>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center">
                      <Icon
                        icon={
                          doc.sharing === "firm-wide"
                            ? GlobeAltIcon
                            : doc.sharing === "shared"
                              ? UserGroupIcon
                              : LockClosedIcon
                        }
                        size="sm"
                        color="secondary"
                      />
                      <Heading level={4}>Sharing &amp; permissions</Heading>
                    </HStack>
                    <SharingList sharing={doc.sharing} sharedWithCount={doc.sharedWithCount} />
                    <Button label="Manage access" variant="ghost" size="sm">
                      Manage access
                    </Button>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={3}>
                    <Heading level={4}>Details</Heading>
                    <VStack gap={2}>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          Uploaded by
                        </Text>
                        <Text type="supporting">{doc.uploadedBy}</Text>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          Folder
                        </Text>
                        <Text type="supporting">{folderLabel(doc.folder)}</Text>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          File type
                        </Text>
                        <Text type="supporting">{doc.fileType.toUpperCase()}</Text>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          Size
                        </Text>
                        <Text type="supporting">{doc.sizeLabel}</Text>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          Tags
                        </Text>
                        <HStack gap={1}>
                          {doc.tags.map((t) => (
                            <Badge key={t} variant="neutral" label={t} />
                          ))}
                        </HStack>
                      </HStack>
                    </VStack>
                  </VStack>
                </Card>
              </VStack>
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
