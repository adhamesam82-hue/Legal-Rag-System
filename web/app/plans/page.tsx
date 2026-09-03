"use client";

/**
 * /plans (T-041) -- three placeholder cards, built honestly rather than
 * invented. The owner has decided the shape (a free trial with every
 * feature, at most three paid tiers, a plan-intent that is not a
 * subscription) and explicitly NOT the plan names, prices or limits. So
 * every price says "to be announced" instead of a number, every feature
 * list says "still being decided" instead of one lifted from a competitor,
 * and no "most popular" badge claims data that does not exist yet.
 *
 * "I'd like this plan" records `plan_intent` on the firm -- an owner's
 * declared interest, not a purchase. Nothing here charges anything or
 * unlocks anything; the trial keeps running exactly as it was.
 */

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Divider } from "@astryxdesign/core/Divider";
import { useOrg, useResource } from "@/lib/org";
import { useFormat } from "@/lib/i18n/format";
import { api, ApiError, PAID_PLANS, type PaidPlan } from "@/lib/api";
import { DataView, InlineError } from "@/components/DataState";

const SALES_EMAIL = "hello@legalos.com";

export default function PlansPage() {
  const { organizationId, role, reloadOrganizations } = useOrg();
  const t = useTranslator();
  const { formatDate } = useFormat();
  const canChoose = role === "owner";

  const firm = useResource(() => api.organization(organizationId!), [organizationId]);
  const [saving, setSaving] = useState<PaidPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PaidPlan) {
    if (!organizationId) return;
    setSaving(plan);
    setError(null);
    try {
      await api.setPlanIntent(organizationId, plan);
      firm.reload();
      reloadOrganizations();
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : t("@legalos.plans.recordFailed"));
    } finally {
      setSaving(null);
    }
  }

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={3}>{t("@legalos.plans.heading")}</Heading>
        <Text type="body" color="secondary">
          {t("@legalos.plans.subtitle")}
        </Text>
      </VStack>

      <InlineError message={error} onDismiss={() => setError(null)} />
      {!canChoose && <Banner status="info" title={t("@legalos.plans.ownerOnly")} />}

      <DataView resource={firm}>
        {(loaded) => (
          <>
            <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
              {PAID_PLANS.map((plan) => (
                <PlanCard
                  key={plan}
                  plan={plan}
                  chosen={loaded.plan_intent === plan}
                  canChoose={canChoose}
                  saving={saving === plan}
                  onChoose={() => choose(plan)}
                />
              ))}
            </Grid>

            {loaded.plan_intent && (
              <Banner
                status="success"
                title={t("@legalos.plans.thanksTitle")}
                description={t("@legalos.plans.thanksBody", { date: formatDate(loaded.trial_ends_at) })}
              />
            )}
          </>
        )}
      </DataView>

      <Divider />
      <Text type="supporting" color="secondary">
        {t("@legalos.plans.legalNotice")}
      </Text>
    </VStack>
  );
}

function PlanCard({
  plan,
  chosen,
  canChoose,
  saving,
  onChoose,
}: {
  plan: PaidPlan;
  chosen: boolean;
  canChoose: boolean;
  saving: boolean;
  onChoose: () => void;
}) {
  const t = useTranslator();
  const isEnterprise = plan === "enterprise";

  return (
    <Card padding={5}>
      <VStack gap={4}>
        <VStack gap={1}>
          <HStack gap={2} vAlign="center">
            <Heading level={5}>{t(`@legalos.plans.plan.${plan}.name`)}</Heading>
            {chosen && <Badge label={t("@legalos.plans.chosen")} variant="green" />}
          </HStack>
          <Text type="body" color="secondary">
            {t(`@legalos.plans.plan.${plan}.blurb`)}
          </Text>
        </VStack>

        <Text type="large" color="secondary">
          {t("@legalos.plans.priceTbd")}
        </Text>

        <Divider />

        <Text type="supporting" color="secondary">
          {t("@legalos.plans.featuresTbd")}
        </Text>

        {isEnterprise ? (
          <Button
            label={t("@legalos.plans.contactSales")}
            variant="secondary"
            as="a"
            href={`mailto:${SALES_EMAIL}`}
          >
            {t("@legalos.plans.contactSales")}
          </Button>
        ) : (
          <Button
            label={t("@legalos.plans.wantThis")}
            variant={chosen ? "secondary" : "primary"}
            isDisabled={!canChoose || saving}
            onClick={onChoose}
          >
            {saving ? t("@legalos.plans.recording") : t("@legalos.plans.wantThis")}
          </Button>
        )}
      </VStack>
    </Card>
  );
}
