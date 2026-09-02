"use client";

/**
 * One document as a card (T-032): a thumbnail where one is honest, the name,
 * what it is, how big it is, its tags by name and colour, and the actions a
 * lawyer reaches for from a grid.
 *
 * THE PREVIEW IS REAL OR IT IS AN ICON. Images get a thumbnail of the actual
 * bytes, fetched with the bearer token (a bare <img src> would arrive at the
 * API without one) and only once the card scrolls into view, so a grid of a
 * hundred files does not download a hundred files on load. Everything else
 * -- PDFs included -- gets the format's icon. A PDF page image would need a
 * rasteriser on the server (poppler/pdfium), which is a deployment decision,
 * and a grey box pretending to be a preview is exactly what the spec forbids.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import {
  ArrowDownTrayIcon,
  DocumentIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PhotoIcon,
  TableCellsIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { API_BASE } from "@/lib/api";
import { useOrg } from "@/lib/org";
import { useDocTypeLabel } from "@/lib/i18n/enum-label";
import { useFormat } from "@/lib/i18n/format";
import type { DocumentTag } from "@/lib/practice";
import { TagToken } from "./TagsDialog";

/** What a card needs to know; the page maps its rows onto this. */
export interface CardDocument {
  id: number;
  name: string;
  contentType: string;
  docType: string;
  size: number;
  hasFile: boolean;
  tagIds: number[];
}

/** Only an image is thumbnailed, and only a reasonably small one. */
const THUMBNAIL_MAX_BYTES = 4 * 1024 * 1024;
const THUMBNAIL_HEIGHT = 120;

export function fileIcon(contentType: string) {
  if (contentType === "application/pdf") return DocumentTextIcon;
  if (contentType.includes("spreadsheet") || contentType === "text/csv") return TableCellsIcon;
  if (contentType.startsWith("image/")) return PhotoIcon;
  return DocumentIcon;
}

/** True once the element has been on screen; stays true afterwards. */
function useSeen(ref: React.RefObject<HTMLElement | null>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, seen]);
  return seen;
}

/** An object URL for the image's bytes, fetched with auth, revoked on unmount. */
function useThumbnail(documentId: number, enabled: boolean) {
  const { practice } = useOrg();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !practice) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    practice.documents
      .contentBlob(documentId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        /* the icon stays; a failed thumbnail is not an error the lawyer needs */
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, enabled, practice]);
  return url;
}

export function DocumentCard({
  doc,
  tagById,
  onEditTags,
  onChangeType,
}: {
  doc: CardDocument;
  tagById: Map<number, DocumentTag>;
  onEditTags: (doc: CardDocument) => void;
  onChangeType: (doc: CardDocument) => void;
}) {
  const t = useTranslator();
  const { formatBytes } = useFormat();
  const docTypeLabel = useDocTypeLabel();
  const { organizationId } = useOrg();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref);
  const isImage = doc.hasFile && doc.contentType.startsWith("image/") && doc.size <= THUMBNAIL_MAX_BYTES;
  const thumbnail = useThumbnail(doc.id, seen && isImage);
  const contentUrl = `${API_BASE}/api/orgs/${organizationId}/documents/${doc.id}/content`;
  const tags = doc.tagIds.map((id) => tagById.get(id)).filter((tag): tag is DocumentTag => Boolean(tag));

  return (
    <div ref={ref} style={{ minWidth: 0 }}>
      <Card>
        <VStack gap={3}>
          {/* --- preview or icon ------------------------------------------ */}
          <Link href={`/documents/${doc.id}`}>
            <div
              style={{
                height: THUMBNAIL_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 6,
              }}
            >
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- an object URL, not a static asset
                <img
                  src={thumbnail}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <Icon icon={fileIcon(doc.contentType)} size="lg" color="secondary" />
              )}
            </div>
          </Link>

          {/* --- name: wraps anywhere, so one long token cannot widen the grid */}
          <Link href={`/documents/${doc.id}`}>
            <div style={{ overflowWrap: "anywhere", minWidth: 0 }}>
              <Text type="body" weight="semibold" maxLines={2}>
                {doc.name}
              </Text>
            </div>
          </Link>

          <HStack gap={2} vAlign="center" wrap="wrap">
            <Badge variant="neutral" label={docTypeLabel(doc.docType)} />
            <Text type="supporting" color="secondary">
              {doc.hasFile ? formatBytes(doc.size) : t("@legalos.documents.noFile")}
            </Text>
          </HStack>

          {tags.length > 0 && (
            <HStack gap={1} wrap="wrap">
              {tags.map((tag) => (
                <TagToken key={tag.id} tag={tag} />
              ))}
            </HStack>
          )}

          {/* --- quick actions ------------------------------------------- */}
          <HStack gap={1} wrap="wrap">
            <Button
              label={t("@legalos.documents.tags.edit")}
              variant="ghost"
              size="sm"
              icon={<Icon icon={TagIcon} size="sm" color="inherit" />}
              onClick={() => onEditTags(doc)}
            />
            <Button
              label={t("@legalos.documents.type.change")}
              variant="ghost"
              size="sm"
              icon={<Icon icon={PencilSquareIcon} size="sm" color="inherit" />}
              onClick={() => onChangeType(doc)}
            />
            {doc.hasFile && (
              <Button
                label={t("@legalos.documents.card.download")}
                variant="ghost"
                size="sm"
                icon={<Icon icon={ArrowDownTrayIcon} size="sm" color="inherit" />}
                href={contentUrl}
              />
            )}
          </HStack>
        </VStack>
      </Card>
    </div>
  );
}
