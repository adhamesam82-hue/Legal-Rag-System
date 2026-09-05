"use client";

/**
 * "الباقة والفوترة": read-only summary of the firm's trial and plan choice
 * (T-041 / E-5). No PATCH here -- the only way to change `plan_intent` is /plans,
 * which is the point of the "عرض الباقات" link. Visible to every role, like
 * the trial bar: a lawyer cannot choose a plan, but seeing what was chosen
 * is not a privileged fact.
 */

import React from "react";
import NextLink from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useFormat } from "@/lib/i18n/format";
import type { Organization } from "@/lib/api";
import { AppliedDiscount } from "@/components/DiscountCodeField";

export function PlanSection({ firm }: { firm: Organization }) {
  const t = useTranslator();
  const { formatDate } = useFormat();

  return (
    <Card padding="24px" bordered shadow className="w-full">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.settings.plan.heading")}
          </h2>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.plan.subtitle")}
          </p>
        </div>

        <div
          className="w-full border-t"
          style={{ borderColor: "var(--border)" }}
        />

        <div className="flex flex-wrap gap-8 items-start">
          {firm.plan === "trial" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                {t("@legalos.settings.plan.currentTrial")}
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  color={firm.trial_expired ? "danger" : "info"}
                  variant="soft"
                >
                  {firm.trial_expired
                    ? t("@legalos.plans.trialBar.expired")
                    : t("@legalos.plans.trialBar.until", {
                        date: formatDate(firm.trial_ends_at),
                      })}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
              {t("@legalos.settings.plan.intentLabel")}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {firm.plan_intent
                ? t(`@legalos.plans.plan.${firm.plan_intent}.name`)
                : t("@legalos.settings.plan.noIntent")}
            </span>
          </div>
        </div>

        {firm.discount_kind && (
          <AppliedDiscount kind={firm.discount_kind} value={firm.discount_value!} />
        )}

        <div
          className="flex items-center justify-end pt-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <NextLink href="/plans" style={{ textDecoration: "none" }}>
            <Button variant="secondary" size="sm">
              {t("@legalos.settings.plan.viewPlans")}
            </Button>
          </NextLink>
        </div>
      </div>
    </Card>
  );
}
