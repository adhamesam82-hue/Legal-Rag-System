"use client";

import { useState } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Switch } from "@astryxdesign/core/Switch";
import { List, ListItem } from "@astryxdesign/core/List";
import { Divider } from "@astryxdesign/core/Divider";
import { Center } from "@astryxdesign/core/Center";
import {
  ArrowDownIcon,
  BoltIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  FolderPlusIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";

// ---------------------------------------------------------------------------
// Automation — visual workflow builder concept. No backend/execution engine
// exists yet; this renders example automations as connected step sequences.
// ---------------------------------------------------------------------------

interface Step {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ai?: boolean;
}

interface AutomationFlow {
  id: string;
  name: string;
  trigger: string;
  description: string;
  isActive: boolean;
  runCount: string;
  steps: Step[];
}

const AUTOMATIONS: AutomationFlow[] = [
  {
    id: "new-client-intake",
    name: "New client intake",
    trigger: "When a new client is created",
    description:
      "Sets up the folder structure, assigns a lawyer, and notifies the client the moment a new client record is created.",
    isActive: true,
    runCount: "38 runs this month",
    steps: [
      {
        title: "New client",
        description: "Triggered when a client record is created in the CRM.",
        icon: UserPlusIcon,
      },
      {
        title: "Generate folder",
        description: "Creates the client's document folder with standard subfolders.",
        icon: FolderPlusIcon,
      },
      {
        title: "Assign lawyer",
        description: "Assigns the client to a lawyer based on practice area and workload.",
        icon: UserGroupIcon,
      },
      {
        title: "Create tasks",
        description: "Adds the standard intake checklist as tasks for the assigned lawyer.",
        icon: CheckCircleIcon,
      },
      {
        title: "Send email",
        description: "Sends a welcome email with the engagement letter attached.",
        icon: EnvelopeIcon,
      },
      {
        title: "WhatsApp message",
        description: "Sends a WhatsApp confirmation to the client's registered number.",
        icon: ChatBubbleOvalLeftEllipsisIcon,
      },
      {
        title: "AI summary",
        description: "Drafts a one-paragraph intake summary for the assigned lawyer to review.",
        icon: SparklesIcon,
        ai: true,
      },
    ],
  },
  {
    id: "hearing-reminder",
    name: "Hearing reminder",
    trigger: "48 hours before a scheduled hearing",
    description:
      "Reminds the assigned lawyer and notifies the client ahead of an upcoming hearing.",
    isActive: true,
    runCount: "12 runs this month",
    steps: [
      {
        title: "Hearing approaching",
        description: "Triggered 48 hours before a hearing on the calendar.",
        icon: ClockIcon,
      },
      {
        title: "Notify assigned lawyer",
        description: "Sends an in-app and email reminder to the lawyer of record.",
        icon: EnvelopeIcon,
      },
      {
        title: "WhatsApp reminder",
        description: "Sends the client a WhatsApp reminder with the hearing date and court.",
        icon: ChatBubbleOvalLeftEllipsisIcon,
      },
      {
        title: "Log reminder sent",
        description: "Records the reminder on the matter timeline.",
        icon: CheckCircleIcon,
      },
    ],
  },
  {
    id: "invoice-overdue",
    name: "Invoice overdue follow-up",
    trigger: "7 days after an invoice's due date, unpaid",
    description:
      "Chases unpaid invoices automatically and escalates to the firm owner if still unpaid after 14 days.",
    isActive: false,
    runCount: "5 runs this month",
    steps: [
      {
        title: "Invoice overdue",
        description: "Triggered when an invoice is 7 days past its due date and unpaid.",
        icon: ExclamationTriangleIcon,
      },
      {
        title: "Send reminder email",
        description: "Sends the client a polite payment reminder with the invoice link.",
        icon: EnvelopeIcon,
      },
      {
        title: "Notify billing staff",
        description: "Flags the invoice in the billing dashboard for staff follow-up.",
        icon: UserGroupIcon,
      },
      {
        title: "Escalate to owner",
        description: "If still unpaid after 14 days, notifies the firm owner directly.",
        icon: ExclamationTriangleIcon,
      },
    ],
  },
];

function StepCard({ step }: { step: Step }) {
  return (
    <Card variant={step.ai ? "purple" : "default"}>
      <HStack gap={3} vAlign="center">
        <Icon
          icon={step.icon}
          size="md"
          className={step.ai ? "text-purple-vivid" : undefined}
          color={step.ai ? undefined : "secondary"}
        />
        <VStack gap={0.5}>
          <Text type="label" weight="semibold">
            {step.title}
          </Text>
          <Text type="supporting" color="secondary">
            {step.description}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

export default function AutomationPage() {
  const t = useTranslator();
  const [selectedId, setSelectedId] = useState(AUTOMATIONS[0].id);
  const selected = AUTOMATIONS.find((a) => a.id === selectedId) ?? AUTOMATIONS[0];
  const [activeState, setActiveState] = useState<Record<string, boolean>>(
    Object.fromEntries(AUTOMATIONS.map((a) => [a.id, a.isActive])),
  );

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="center">
              <VStack gap={1}>
                <Heading level={2}>{t("@legalos.automation.heading")}</Heading>
                <Text type="body" color="secondary">
                  {t("@legalos.automation.subtitle")}
                </Text>
              </VStack>
              <Button
                label={t("@legalos.automation.newAutomation")}
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                {t("@legalos.automation.newAutomation")}
              </Button>
            </HStack>

            <HStack gap={6} vAlign="start">
              <Card padding={0} width={320}>
                <List hasDividers density="balanced">
                  {AUTOMATIONS.map((automation) => (
                    <ListItem
                      key={automation.id}
                      label={automation.name}
                      description={
                        <Text type="supporting" color="secondary" maxLines={2}>
                          {t("@legalos.automation.triggerAndSteps", {
                            trigger: automation.trigger,
                            steps: t("@legalos.automation.stepCount", {
                              count: automation.steps.length,
                            }),
                          })}
                        </Text>
                      }
                      isSelected={automation.id === selectedId}
                      onClick={() => setSelectedId(automation.id)}
                      startContent={
                        <Icon icon={BoltIcon} size="sm" color="secondary" />
                      }
                      endContent={
                        <Switch
                          label={t("@legalos.automation.toggle", {
                            name: automation.name,
                            state: t(
                              activeState[automation.id]
                                ? "@legalos.automation.toggle.off"
                                : "@legalos.automation.toggle.on",
                            ),
                          })}
                          isLabelHidden
                          size="sm"
                          value={activeState[automation.id]}
                          onChange={(checked) =>
                            setActiveState((prev) => ({ ...prev, [automation.id]: checked }))
                          }
                        />
                      }
                    />
                  ))}
                </List>
              </Card>

              <VStack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Card>
                  <VStack gap={3}>
                    <HStack hAlign="between" vAlign="center">
                      <VStack gap={1}>
                        <HStack gap={2} vAlign="center">
                          <Heading level={4}>{selected.name}</Heading>
                          <Badge
                            variant={activeState[selected.id] ? "success" : "neutral"}
                            label={t(
                              activeState[selected.id]
                                ? "@legalos.automation.status.active"
                                : "@legalos.automation.status.paused",
                            )}
                          />
                        </HStack>
                        <Text type="body" color="secondary">
                          {selected.description}
                        </Text>
                      </VStack>
                    </HStack>
                    <Divider />
                    <HStack gap={6}>
                      <VStack gap={0.5}>
                        <Text type="supporting" color="secondary">
                          {t("@legalos.automation.trigger")}
                        </Text>
                        <Text type="body">{selected.trigger}</Text>
                      </VStack>
                      <VStack gap={0.5}>
                        <Text type="supporting" color="secondary">
                          {t("@legalos.automation.activity")}
                        </Text>
                        <Text type="body">{selected.runCount}</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={0}>
                    <Text type="label" weight="semibold" color="secondary">
                      {t("@legalos.automation.workflowSteps")}
                    </Text>
                    <VStack gap={0} style={{ marginTop: "var(--spacing-3)" }}>
                      {selected.steps.map((step, index) => (
                        <VStack key={step.title} gap={0}>
                          <StepCard step={step} />
                          {index < selected.steps.length - 1 && (
                            <Center height={28} axis="both">
                              <Icon icon={ArrowDownIcon} size="sm" color="secondary" />
                            </Center>
                          )}
                        </VStack>
                      ))}
                    </VStack>
                  </VStack>
                </Card>
              </VStack>
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
