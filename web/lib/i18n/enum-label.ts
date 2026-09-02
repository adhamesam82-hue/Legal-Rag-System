"use client";

import { useCallback } from "react";
import { useTranslator, type TranslatorFn } from "@astryxdesign/core/i18n";

/**
 * Translating replacement for `label()` in lib/practice.ts.
 *
 * The API returns lowercase enum values; this resolves one to its display
 * label in the active locale. Unknown values fall through to the raw value
 * (matching `label()`'s behaviour) so a new enum member added server-side
 * shows up as itself rather than as a blank or a raw catalog key — Astryx's
 * resolver returns the key itself on a miss, which is what the check below
 * detects.
 */
export function enumLabelWith(
  t: TranslatorFn,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const key = `@legalos.enum.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

/** Hook form, for the common case of a component rendering enum values. */
export function useEnumLabel() {
  const t = useTranslator();
  return useCallback(
    (value: string | null | undefined) => enumLabelWith(t, value),
    [t],
  );
}

/**
 * Document types (doc_type, T-025) get their own namespace because the flat
 * enum namespace already has "judgment" as a hearing outcome. Falls back to
 * the flat label, so "other" and any unknown value still resolve.
 */
export function docTypeLabelWith(
  t: TranslatorFn,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const key = `@legalos.enum.docType.${value}`;
  const translated = t(key);
  return translated === key ? enumLabelWith(t, value) : translated;
}

export function useDocTypeLabel() {
  const t = useTranslator();
  return useCallback(
    (value: string | null | undefined) => docTypeLabelWith(t, value),
    [t],
  );
}
