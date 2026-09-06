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
import NextLink from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
      },
      { rootMargin: "200px" },
    );
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
  const FileIconComponent = fileIcon(doc.contentType);

  return (
    <div ref={ref} style={{ minWidth: 0 }}>
      <Card className="h-full">
        <div className="p-4 flex flex-col gap-3 h-full">
          {/* --- preview or icon ------------------------------------------ */}
          <NextLink href={`/documents/${doc.id}`} className="block">
            <div
              className="w-full flex items-center justify-center overflow-hidden border"
              style={{
                height: `${THUMBNAIL_HEIGHT}px`,
                borderRadius: "var(--rs)",
                backgroundColor: "var(--surface2)",
                borderColor: "var(--border)",
              }}
            >
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- an object URL, not a static asset
                <img
                  src={thumbnail}
                  alt=""
                  className="w-full h-full object-cover block"
                />
              ) : (
                <FileIconComponent className="w-10 h-10" style={{ color: "var(--text2)" }} />
              )}
            </div>
          </NextLink>

          {/* --- name: wraps anywhere, so one long token cannot widen the grid */}
          <NextLink href={`/documents/${doc.id}`} className="block">
            <div style={{ overflowWrap: "anywhere", minWidth: 0 }}>
              <h4
                className="text-sm font-semibold line-clamp-2 hover:underline"
                style={{ color: "var(--text)" }}
              >
                {doc.name}
              </h4>
            </div>
          </NextLink>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="soft" color="neutral">
              {docTypeLabel(doc.docType)}
            </Badge>
            <span style={{ color: "var(--text2)" }}>
              {doc.hasFile ? formatBytes(doc.size) : t("@legalos.documents.noFile")}
            </span>
          </div>

          {tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tags.map((tag) => (
                <TagToken key={tag.id} tag={tag} />
              ))}
            </div>
          )}

          {/* --- quick actions ------------------------------------------- */}
          <div
            className="flex items-center gap-1 flex-wrap mt-auto pt-2 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <Button
              variant="ghost"
              size="sm"
              title={t("@legalos.documents.tags.edit")}
              onClick={() => onEditTags(doc)}
            >
              <TagIcon className="w-4 h-4" />
              <span className="sr-only">{t("@legalos.documents.tags.edit")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={t("@legalos.documents.type.change")}
              onClick={() => onChangeType(doc)}
            >
              <PencilSquareIcon className="w-4 h-4" />
              <span className="sr-only">{t("@legalos.documents.type.change")}</span>
            </Button>
            {doc.hasFile && (
              <a
                href={contentUrl}
                download
                className="inline-flex items-center justify-center p-1.5 rounded transition-colors hover:bg-[var(--surface2)]"
                style={{ color: "var(--text2)", borderRadius: "var(--rs)" }}
                title={t("@legalos.documents.card.download")}
                aria-label={t("@legalos.documents.card.download")}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
