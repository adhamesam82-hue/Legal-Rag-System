"use client";

/**
 * /subscribe (T-041) -- one honest state, because there is only one true
 * thing to say: no payment gateway is wired up.
 */

import Link from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useOrg, useResource } from "@/lib/org";
import { useFormat } from "@/lib/i18n/format";
import { api } from "@/lib/api";
import { DataView } from "@/components/DataState";

export default function SubscribePage() {
  const { organizationId, role } = useOrg();
  const t = useTranslator();
  const { formatDate } = useFormat();
  const firm = useResource(() => api.organization(organizationId!), [organizationId]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
        {t("@legalos.subscribe.heading")}
      </h1>

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
            <Card className="p-8 flex flex-col items-center text-center gap-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--surface2)", color: "var(--text2)" }}
              >
                <Icon name="credit_card" size={24} />
              </div>

              <div className="flex flex-col gap-2 max-w-md">
                <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                  {t("@legalos.subscribe.notEnabled")}
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                  {body}
                </p>
              </div>

              {!loaded.plan_intent && (
                <Link href="/plans">
                  <Button>
                    <span>{t("@legalos.subscribe.goToPlans")}</span>
                  </Button>
                </Link>
              )}
            </Card>
          );
        }}
      </DataView>
    </div>
  );
}
