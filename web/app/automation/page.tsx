"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";

// ---------------------------------------------------------------------------
// Automation — visual workflow builder concept. No backend/execution engine
// exists yet; this renders example automations as connected step sequences.
// ---------------------------------------------------------------------------

interface Step {
  title: string;
  description: string;
  iconName: string;
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
        iconName: "person_add",
      },
      {
        title: "Generate folder",
        description: "Creates the client's document folder with standard subfolders.",
        iconName: "create_new_folder",
      },
      {
        title: "Assign lawyer",
        description: "Assigns the client to a lawyer based on practice area and workload.",
        iconName: "group",
      },
      {
        title: "Create tasks",
        description: "Adds the standard intake checklist as tasks for the assigned lawyer.",
        iconName: "check_circle",
      },
      {
        title: "Send email",
        description: "Sends a welcome email with the engagement letter attached.",
        iconName: "mail",
      },
      {
        title: "WhatsApp message",
        description: "Sends a WhatsApp confirmation to the client's registered number.",
        iconName: "chat",
      },
      {
        title: "AI summary",
        description: "Drafts a one-paragraph intake summary for the assigned lawyer to review.",
        iconName: "auto_awesome",
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
        iconName: "schedule",
      },
      {
        title: "Notify assigned lawyer",
        description: "Sends an in-app and email reminder to the lawyer of record.",
        iconName: "mail",
      },
      {
        title: "WhatsApp reminder",
        description: "Sends the client a WhatsApp reminder with the hearing date and court.",
        iconName: "chat",
      },
      {
        title: "Log reminder sent",
        description: "Records the reminder on the matter timeline.",
        iconName: "check_circle",
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
        iconName: "warning",
      },
      {
        title: "Send reminder email",
        description: "Sends the client a polite payment reminder with the invoice link.",
        iconName: "mail",
      },
      {
        title: "Notify billing staff",
        description: "Flags the invoice in the billing dashboard for staff follow-up.",
        iconName: "group",
      },
      {
        title: "Escalate to owner",
        description: "If still unpaid after 14 days, notifies the firm owner directly.",
        iconName: "warning",
      },
    ],
  },
];

function StepCard({ step }: { step: Step }) {
  return (
    <Card
      className="p-4 transition-colors"
      style={{
        borderColor: step.ai ? "var(--primary)" : "var(--border)",
        backgroundColor: step.ai ? "var(--surface2)" : "var(--surface)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: step.ai ? "var(--primary-soft)" : "var(--surface3)",
            color: step.ai ? "var(--primary)" : "var(--text2)",
          }}
        >
          <Icon name={step.iconName} size={20} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
            {step.title}
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {step.description}
          </span>
        </div>
      </div>
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
    <div className="flex flex-col gap-6 p-6">
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.automation.heading")}
          </h1>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.automation.subtitle")}
          </p>
        </div>
        <Button>
          <Icon name="add" size={16} />
          <span>{t("@legalos.automation.newAutomation")}</span>
        </Button>
      </div>

      {/* تفاصيل وتدفقات الأتمتة */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* قائمة التدفقات */}
        <Card className="w-full lg:w-80 p-0 overflow-hidden flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {AUTOMATIONS.map((automation) => {
            const isSelected = automation.id === selectedId;
            return (
              <div
                key={automation.id}
                onClick={() => setSelectedId(automation.id)}
                className={`p-4 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                  isSelected ? "bg-[var(--surface2)]" : "hover:bg-[var(--surface2)]"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5" style={{ color: "var(--text2)" }}>
                    <Icon name="bolt" size={18} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                      {automation.name}
                    </span>
                    <span className="text-[11px] line-clamp-2" style={{ color: "var(--text2)" }}>
                      {t("@legalos.automation.triggerAndSteps", {
                        trigger: automation.trigger,
                        steps: t("@legalos.automation.stepCount", {
                          count: automation.steps.length,
                        }),
                      })}
                    </span>
                  </div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center pt-0.5"
                >
                  <input
                    type="checkbox"
                    checked={activeState[automation.id] ?? false}
                    onChange={(e) =>
                      setActiveState((prev) => ({
                        ...prev,
                        [automation.id]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 cursor-pointer accent-[var(--primary)]"
                    aria-label={t("@legalos.automation.toggle", {
                      name: automation.name,
                      state: t(
                        activeState[automation.id]
                          ? "@legalos.automation.toggle.off"
                          : "@legalos.automation.toggle.on",
                      ),
                    })}
                  />
                </div>
              </div>
            );
          })}
        </Card>

        {/* تفاصيل التدفق المحدد وخطواته */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                    {selected.name}
                  </h2>
                  <Badge color={activeState[selected.id] ? "primary" : "neutral"}>
                    {t(
                      activeState[selected.id]
                        ? "@legalos.automation.status.active"
                        : "@legalos.automation.status.paused",
                    )}
                  </Badge>
                </div>
                <p className="text-xs" style={{ color: "var(--text2)" }}>
                  {selected.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t flex flex-wrap gap-6 text-xs" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-col gap-0.5">
                <span style={{ color: "var(--text2)" }}>
                  {t("@legalos.automation.trigger")}
                </span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {selected.trigger}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span style={{ color: "var(--text2)" }}>
                  {t("@legalos.automation.activity")}
                </span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {selected.runCount}
                </span>
              </div>
            </div>
          </Card>

          {/* الخطوات التسلسلية */}
          <Card className="p-5 flex flex-col gap-4">
            <span className="text-xs font-bold" style={{ color: "var(--text2)" }}>
              {t("@legalos.automation.workflowSteps")}
            </span>
            <div className="flex flex-col items-stretch gap-2 mt-2">
              {selected.steps.map((step, index) => (
                <div key={step.title} className="flex flex-col items-center gap-2">
                  <div className="w-full">
                    <StepCard step={step} />
                  </div>
                  {index < selected.steps.length - 1 && (
                    <div className="flex items-center justify-center py-1" style={{ color: "var(--text3)" }}>
                      <Icon name="arrow_downward" size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
