"use client";

/**
 * /plans (T-041) -- three placeholder cards, built honestly rather than
 * invented. The owner has decided the shape (a free trial with every
 * feature, at most three paid tiers, a plan-intent that is not a
 * subscription) and explicitly NOT the plan names, prices or limits.
 */

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useOrg, useResource } from "@/lib/org";
import { useFormat } from "@/lib/i18n/format";
import { api, ApiError, PAID_PLANS, type PaidPlan } from "@/lib/api";
import { DataView, InlineError } from "@/components/DataState";
import { AppliedDiscount, DiscountCodeField } from "@/components/DiscountCodeField";

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
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          {t("@legalos.plans.heading")}
        </h1>
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {t("@legalos.plans.subtitle")}
        </p>
      </div>

      <InlineError message={error} onDismiss={() => setError(null)} />
      {!canChoose && (
        <Alert type="info" title={t("@legalos.plans.ownerOnly")} />
      )}

      <DataView resource={firm}>
        {(loaded) => (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            </div>

            {loaded.plan_intent && (
              <Alert
                type="success"
                title={t("@legalos.plans.thanksTitle")}
              >
                {t("@legalos.plans.thanksBody", { date: formatDate(loaded.trial_ends_at) })}
              </Alert>
            )}

            {loaded.discount_kind ? (
              <AppliedDiscount kind={loaded.discount_kind} value={loaded.discount_value!} />
            ) : (
              canChoose && (
                <DiscountCodeField
                  onApply={async (code) => {
                    await api.applyDiscountCode(loaded.id, code);
                    firm.reload();
                    reloadOrganizations();
                  }}
                />
              )
            )}
          </div>
        )}
      </DataView>

      <div className="pt-4 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
        {t("@legalos.plans.legalNotice")}
      </div>
    </div>
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
    <Card className="p-5 flex flex-col justify-between gap-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t(`@legalos.plans.plan.${plan}.name`)}
            </h2>
            {chosen && <Badge color="success">{t("@legalos.plans.chosen")}</Badge>}
          </div>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t(`@legalos.plans.plan.${plan}.blurb`)}
          </p>
        </div>

        <div className="text-lg font-bold" style={{ color: "var(--text2)" }}>
          {t("@legalos.plans.priceTbd")}
        </div>

        <div className="pt-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
          {t("@legalos.plans.featuresTbd")}
        </div>
      </div>

      <div className="pt-2">
        {isEnterprise ? (
          <a
            href={`mailto:${SALES_EMAIL}`}
            className="block"
          >
            <Button variant="secondary" className="w-full">
              <span>{t("@legalos.plans.contactSales")}</span>
            </Button>
          </a>
        ) : (
          <Button
            variant={chosen ? "secondary" : "primary"}
            disabled={!canChoose || saving}
            loading={saving}
            onClick={onChoose}
            className="w-full"
          >
            <span>{saving ? t("@legalos.plans.recording") : t("@legalos.plans.wantThis")}</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
