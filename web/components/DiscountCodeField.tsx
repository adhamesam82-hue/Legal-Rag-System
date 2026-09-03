"use client";

/**
 * "لديك كود خصم؟" (T-042) -- the one input shared by /plans and the
 * create-firm screen. Once a firm HAS a code, this renders what it is
 * instead of another input: one code per firm, and re-showing the field
 * would suggest a second one could still be entered.
 *
 * An extra-trial-days code has already done its work by the time this
 * renders (trial_ends_at moved); a percent/fixed code has not, and says so
 * plainly rather than showing a discounted price nobody can compute yet.
 */

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { ApiError, type DiscountKind } from "@/lib/api";

export function AppliedDiscount({
  kind,
  value,
}: {
  kind: DiscountKind;
  value: number;
}) {
  const t = useTranslator();
  return (
    <Banner
      status="success"
      title={
        kind === "extra_trial_days"
          ? t("@legalos.discount.appliedTrialDays", { days: value })
          : t("@legalos.discount.appliedFuture", {
              amount: kind === "percent" ? t("@legalos.discount.percent", { value }) : value,
            })
      }
    />
  );
}

export function DiscountCodeField({
  onApply,
  disabled,
}: {
  /** Throws on failure -- the field shows whatever message comes back. */
  onApply: (code: string) => Promise<void>;
  disabled?: boolean;
}) {
  const t = useTranslator();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim()) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(code.trim());
      setCode("");
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : t("@legalos.discount.applyFailed"));
    } finally {
      setApplying(false);
    }
  }

  return (
    <VStack gap={2}>
      <HStack gap={2} vAlign="end" wrap="wrap">
        <TextInput
          label={t("@legalos.discount.haveACode")}
          value={code}
          onChange={setCode}
          placeholder={t("@legalos.discount.codePlaceholder")}
          isDisabled={disabled || applying}
          width={220}
        />
        <Button
          label={t("@legalos.discount.apply")}
          variant="secondary"
          isDisabled={disabled || applying || !code.trim()}
          onClick={submit}
        >
          {applying ? t("@legalos.discount.applying") : t("@legalos.discount.apply")}
        </Button>
      </HStack>
      {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
    </VStack>
  );
}
