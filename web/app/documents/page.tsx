"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TreeList } from "@astryxdesign/core/TreeList";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import {
  FolderIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  SparklesIcon,
  LockClosedIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ChatBubbleLeftIcon,
  ArrowUpTrayIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { DOCUMENTS, FOLDER_GROUPS, type DocumentItem } from "./data";

const AI_ICON_CLASS = "text-purple-vivid";

const FILE_ICON: Record<DocumentItem["fileType"], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  pdf: DocumentTextIcon,
  docx: DocumentIcon,
  xlsx: DocumentIcon,
  img: PhotoIcon,
};

const ALL_TAGS = Array.from(new Set(DOCUMENTS.flatMap((d) => d.tags))).sort();

function SharingIndicator({ doc }: { doc: DocumentItem }) {
  if (doc.sharing === "firm-wide") {
    return (
      <HStack gap={1} vAlign="center">
        <Icon icon={GlobeAltIcon} size="xsm" color="secondary" />
        <Text type="supporting" color="secondary">
          Firm-wide
        </Text>
      </HStack>
    );
  }
  if (doc.sharing === "shared") {
    return (
      <HStack gap={1} vAlign="center">
        <Icon icon={UserGroupIcon} size="xsm" color="secondary" />
        <Text type="supporting" color="secondary">
          Shared · {doc.sharedWithCount}
        </Text>
      </HStack>
    );
  }
  return (
    <HStack gap={1} vAlign="center">
      <Icon icon={LockClosedIcon} size="xsm" color="secondary" />
      <Text type="supporting" color="secondary">
        Private
      </Text>
    </HStack>
  );
}

function OcrIndicator({ status }: { status: DocumentItem["ocrStatus"] }) {
  if (status === "complete") {
    return (
      <HStack gap={1} vAlign="center">
        <Icon icon={CheckCircleIcon} size="xsm" color="success" />
        <Text type="supporting" color="secondary">
          OCR complete
        </Text>
      </HStack>
    );
  }
  if (status === "processing") {
    return (
      <HStack gap={1} vAlign="center">
        <Icon icon={ArrowPathIcon} size="xsm" color="secondary" />
        <Text type="supporting" color="secondary">
          OCR processing
        </Text>
      </HStack>
    );
  }
  return (
    <Text type="supporting" color="secondary">
      —
    </Text>
  );
}

export default function DocumentsPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return DOCUMENTS.filter((doc) => {
      if (selectedFolder && doc.folder !== selectedFolder) return false;
      if (activeTag && !doc.tags.includes(activeTag)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !doc.name.toLowerCase().includes(q) &&
          !(doc.matter ?? "").toLowerCase().includes(q) &&
          !doc.tags.some((t) => t.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [selectedFolder, activeTag, search]);

  const columns: TableColumn<DocumentItem>[] = [
    {
      key: "name",
      header: "Name",
      width: proportional(3),
      renderCell: (doc) => {
        const FileIcon = FILE_ICON[doc.fileType];
        return (
          <HStack gap={2} vAlign="center">
            <Icon icon={FileIcon} size="sm" color="secondary" />
            <Link href={`/documents/${doc.id}`}>{doc.name}</Link>
            {doc.hasAiSummary && (
              <Icon
                icon={SparklesIcon}
                size="xsm"
                className={AI_ICON_CLASS}
                aria-label="AI summary available"
              />
            )}
          </HStack>
        );
      },
    },
    {
      key: "matter",
      header: "Matter",
      width: proportional(2),
      renderCell: (doc) =>
        doc.matter ? (
          <Text type="body" color="secondary">
            {doc.matter}
          </Text>
        ) : (
          <Text type="body" color="secondary">
            —
          </Text>
        ),
    },
    {
      key: "uploadedBy",
      header: "Uploaded by",
      width: proportional(1.6),
      renderCell: (doc) => (
        <HStack gap={2} vAlign="center">
          <Avatar name={doc.uploadedBy} size="xsm" tooltip={false} />
          <Text type="body">{doc.uploadedBy}</Text>
        </HStack>
      ),
    },
    { key: "modified", header: "Modified", width: pixel(110) },
    { key: "sizeLabel", header: "Size", width: pixel(80) },
    {
      key: "ocr",
      header: "OCR",
      width: pixel(140),
      renderCell: (doc) => <OcrIndicator status={doc.ocrStatus} />,
    },
    {
      key: "sharing",
      header: "Sharing",
      width: pixel(120),
      renderCell: (doc) => <SharingIndicator doc={doc} />,
    },
    {
      key: "comments",
      header: "Comments",
      width: pixel(100),
      renderCell: (doc) => (
        <HStack gap={1} vAlign="center">
          <Icon icon={ChatBubbleLeftIcon} size="xsm" color="secondary" />
          <Text type="supporting" color="secondary">
            {doc.commentsCount}
          </Text>
        </HStack>
      ),
    },
  ];

  const folderTreeItems = [
    {
      id: "all",
      label: "All Documents",
      startContent: <Icon icon={FolderIcon} size="sm" color="secondary" />,
      isSelected: selectedFolder === null,
      onClick: () => setSelectedFolder(null),
    },
    ...FOLDER_GROUPS.map((group) => ({
      id: group.title,
      label: group.title,
      isExpanded: true,
      children: group.folders.map((folder) => ({
        id: folder.id,
        label: folder.label,
        startContent: <Icon icon={FolderIcon} size="sm" color="secondary" />,
        isSelected: selectedFolder === folder.id,
        onClick: () => setSelectedFolder(folder.id),
        endContent: (
          <Text type="supporting" color="secondary">
            {DOCUMENTS.filter((d) => d.folder === folder.id).length}
          </Text>
        ),
      })),
    })),
  ];

  return (
    <Layout
      height="fill"
      start={
        <LayoutPanel width={232} hasDivider>
          <VStack gap={3}>
            <Text type="label" color="secondary">
              Folders
            </Text>
            <TreeList items={folderTreeItems} density="compact" />
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={0}>
          <VStack gap={5}>
            <HStack hAlign="between" vAlign="center">
              <VStack gap={1}>
                <Heading level={2}>Documents</Heading>
                <Text type="body" color="secondary">
                  {selectedFolder ? folderCrumb(selectedFolder) : "All firm and matter documents"}
                </Text>
              </VStack>
              <HStack gap={2}>
                <Button
                  label="New folder"
                  variant="secondary"
                  icon={<Icon icon={FolderPlusIcon} size="sm" color="inherit" />}
                >
                  New folder
                </Button>
                <Button
                  label="Upload document"
                  variant="primary"
                  icon={<Icon icon={ArrowUpTrayIcon} size="sm" color="inherit" />}
                >
                  Upload
                </Button>
              </HStack>
            </HStack>

            <HStack hAlign="between" vAlign="center" gap={4}>
              <TextInput
                label="Search documents"
                isLabelHidden
                value={search}
                onChange={setSearch}
                placeholder="Search documents, matters, or tags"
                startIcon={MagnifyingGlassIcon}
                hasClear
                width={340}
              />
              <HStack gap={2} vAlign="center">
                <Text type="supporting" color="secondary">
                  Tags:
                </Text>
                {ALL_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    label={`Filter by ${tag}`}
                    variant={activeTag === tag ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </HStack>
            </HStack>

            {filtered.length > 0 ? (
              <Table data={filtered} columns={columns} idKey="id" hasHover density="balanced" />
            ) : (
              <EmptyState
                icon={<Icon icon={MagnifyingGlassIcon} size="lg" color="secondary" />}
                title="No documents match your filters"
                description="Try a different search term, clear the active tag, or choose another folder."
                actions={
                  <Button
                    label="Clear filters"
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setActiveTag(null);
                      setSelectedFolder(null);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function folderCrumb(folderId: string): string {
  for (const group of FOLDER_GROUPS) {
    const match = group.folders.find((f) => f.id === folderId);
    if (match) return `${group.title} / ${match.label}`;
  }
  return folderId;
}
