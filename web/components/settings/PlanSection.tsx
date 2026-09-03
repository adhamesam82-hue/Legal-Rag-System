"use client";

/**
 * "الباقة والفوترة": read-only summary of the firm's trial and plan choice
 * (T-041). No PATCH here -- the only way to change `plan_intent` is /plans,
 * which is the point of the "عرض الباقات" link. Visible to every role, like
 * the trial bar: a lawyer cannot choose a plan, but seeing what was chosen
 * is not a privileged fact.
 */

import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { useFormat } from "@/lib/i18n/format";
import { PrefetchedNavLink } from "@/app/providers";
import type { Organization } from "@/lib/api";
import { AppliedDiscount } from "@/components/DiscountCodeField";

export function PlanSection({ firm }: { firm: Organization }) {
  const t = useTranslator();
  const { formatDate } = useFormat();

  return (
    <Card>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={5}>{t("@legalos.settings.plan.heading")}</Heading>
          <Text type="body" color="secondary">
            {t("@legalos.settings.plan.subtitle")}
          </Text>
        </VStack>

        <Divider />

        <HStack gap={6} wrap="wrap">
          {firm.plan === "trial" && (
            <VStack gap={0.5}>
              <Text type="supporting" color="secondary">
                {t("@legalos.settings.plan.currentTrial")}
              </Text>
              <HStack gap={2} vAlign="center">
                <Badge
                  label={
                    firm.trial_expired
                      ? t("@legalos.plans.trialBar.expired")
                      : t("@legalos.plans.trialBar.until", { date: formatDate(firm.trial_ends_at) })
                  }
                  variant={firm.trial_expired ? "error" : "info"}
                />
              </HStack>
            </VStack>
          )}

          <VStack gap={0.5}>
            <Text type="supporting" color="secondary">
              {t("@legalos.settings.plan.intentLabel")}
            </Text>
            <Text type="body">
              {firm.plan_intent
                ? t(`@legalos.plans.plan.${firm.plan_intent}.name`)
                : t("@legalos.settings.plan.noIntent")}
            </Text>
          </VStack>
        </HStack>

        {firm.discount_kind && (
          <AppliedDiscount kind={firm.discount_kind} value={firm.discount_value!} />
        )}

        <HStack hAlign="end">
          <Button
            label={t("@legalos.settings.plan.viewPlans")}
            variant="secondary"
            as={PrefetchedNavLink}
            href="/plans"
          >
            {t("@legalos.settings.plan.viewPlans")}
          </Button>
        </HStack>
      </VStack>
    </Card>
  );
}
