"use client";

/**
 * /subscribe (T-041) -- one honest state, because there is only one true
 * thing to say: no payment gateway is wired up. NO card field, no gateway
 * logos, no "pay now" button -- those are added when a gateway is chosen,
 * in that gateway's own ticket. A fake card field that swallows a number
 * and does nothing is the single worst lie this screen could tell.
 */

import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Button } from "@astryxdesign/core/Button";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import { useOrg, useResource } from "@/lib/org";
import { useFormat } from "@/lib/i18n/format";
import { api } from "@/lib/api";
import { DataView } from "@/components/DataState";
import { PrefetchedNavLink } from "@/app/providers";

export default function SubscribePage() {
  const { organizationId } = useOrg();
  const t = useTranslator();
  const { formatDate } = useFormat();
  const firm = useResource(() => api.organization(organizationId!), [organizationId]);

  return (
    <VStack gap={6}>
      <Heading level={3}>{t("@legalos.subscribe.heading")}</Heading>

      <DataView resource={firm}>
        {(loaded) => {
          const body = loaded.plan_intent
            ? t("@legalos.subscribe.withChoiceBody", {
                plan: t(`@legalos.plans.plan.${loaded.plan_intent}.name`),
                date: formatDate(loaded.trial_ends_at),
              })
            : loaded.trial_expired
              ? t("@legalos.subscribe.expiredBody")
              : t("@legalos.subscribe.noChoiceBody", { date: formatDate(loaded.trial_ends_at) });

          return (
            <Card padding={6}>
              <VStack gap={4} hAlign="center">
                <Icon icon={CreditCardIcon} size="lg" color="secondary" />
                <VStack gap={1} hAlign="center">
                  <Heading level={5}>{t("@legalos.subscribe.notEnabled")}</Heading>
                  <Text type="body" color="secondary" style={{ textAlign: "center" }}>
                    {body}
                  </Text>
                </VStack>
                {!loaded.plan_intent && (
                  <Button
                    label={t("@legalos.subscribe.goToPlans")}
                    variant="primary"
                    as={PrefetchedNavLink}
                    href="/plans"
                  >
                    {t("@legalos.subscribe.goToPlans")}
                  </Button>
                )}
              </VStack>
            </Card>
          );
        }}
      </DataView>
    </VStack>
  );
}
