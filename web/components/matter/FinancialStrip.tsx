"use client";

/**
 * The three figures a partner opens a matter to see -- unbilled work, what is
 * owed, and the client's money we hold -- as one compact row.
 *
 * It sits in the page header, above the tabs, so it is on screen whatever
 * tab is open. It used to be the top panel of the dashboard tab, which put
 * the money in front of the case file; the decision (spec §2, س-٢) was to
 * keep it visible everywhere and give the dashboard to the file.
 */

import React from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { useFormat } from "@/lib/i18n/format";
import { financialsOf, type WorkspaceData } from "./shared";

export function FinancialStrip({
  data,
  onQuickBill,
  onOpenBills,
  onRecordDeposit,
}: {
  data: WorkspaceData;
  onQuickBill: () => void;
  onOpenBills: () => void;
  onRecordDeposit: () => void;
}) {
  const t = useTranslator();
  const { formatEGP } = useFormat();
  const money = financialsOf(data);

  return (
    <div className="flex items-center gap-6 flex-wrap py-2">
      <Figure
        label={t("@legalos.matterWorkspace.financial.workInProgress")}
        value={formatEGP(money.workInProgress, money.currency)}
        action={
          <Button
            variant="ghost"
            size="sm"
            disabled={money.workInProgress <= 0}
            onClick={onQuickBill}
          >
            {t("@legalos.matterWorkspace.financial.quickBill")}
          </Button>
        }
      />
      <Figure
        label={t("@legalos.matterWorkspace.financial.outstanding")}
        value={formatEGP(money.outstanding, money.currency)}
        detail={
          money.overdue > 0
            ? `${t("@legalos.matterWorkspace.financial.overdue")}: ${formatEGP(
                money.overdue,
                money.currency,
              )}`
            : undefined
        }
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenBills}
          >
            {t("@legalos.matterWorkspace.financial.viewBills")}
          </Button>
        }
      />
      <Figure
        label={t("@legalos.matterWorkspace.financial.clientFunds")}
        value={formatEGP(money.clientFunds, money.currency)}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecordDeposit}
          >
            {t("@legalos.matterWorkspace.financial.recordDeposit")}
          </Button>
        }
      />
    </div>
  );
}

function Figure({
  label,
  value,
  detail,
  action,
}: {
  label: string;
  value: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
        <span className="text-xs" style={{ color: "var(--text3)" }}>
          {label}
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {value}
        </span>
        {detail && (
          <span className="text-xs" style={{ color: "var(--danger)" }}>
            {detail}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
