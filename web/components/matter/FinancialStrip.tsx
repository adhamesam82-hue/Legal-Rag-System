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

import { useTranslator } from "@astryxdesign/core/i18n";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
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
    <HStack gap={6} vAlign="center" wrap="wrap">
      <Figure
        label={t("@legalos.matterWorkspace.financial.workInProgress")}
        value={formatEGP(money.workInProgress, money.currency)}
        action={
          <Button
            label={t("@legalos.matterWorkspace.financial.quickBill")}
            variant="ghost"
            size="sm"
            isDisabled={money.workInProgress <= 0}
            onClick={onQuickBill}
          />
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
            label={t("@legalos.matterWorkspace.financial.viewBills")}
            variant="ghost"
            size="sm"
            onClick={onOpenBills}
          />
        }
      />
      <Figure
        label={t("@legalos.matterWorkspace.financial.clientFunds")}
        value={formatEGP(money.clientFunds, money.currency)}
        action={
          <Button
            label={t("@legalos.matterWorkspace.financial.recordDeposit")}
            variant="ghost"
            size="sm"
            onClick={onRecordDeposit}
          />
        }
      />
    </HStack>
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
    <HStack gap={3} vAlign="center">
      <VStack gap={0}>
        <Text type="supporting" color="secondary">
          {label}
        </Text>
        <Text type="body" weight="semibold">
          {value}
        </Text>
        {detail && (
          <Text type="supporting" color="secondary">
            {detail}
          </Text>
        )}
      </VStack>
      {action}
    </HStack>
  );
}
