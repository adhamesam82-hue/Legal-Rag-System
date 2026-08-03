"use client";

import { use, useState } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Divider } from "@astryxdesign/core/Divider";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { TextArea } from "@astryxdesign/core/TextArea";
import { DateTimeInput } from "@astryxdesign/core/DateTimeInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  PencilSquareIcon,
  FlagIcon,
  BuildingOffice2Icon,
  UserIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  getLead,
  STAGE_META,
  type TimelineEntryType,
  type ConsultationInfo,
} from "../data";
import { useFormat } from "@/lib/i18n/format";

const TIMELINE_ICON: Record<TimelineEntryType, typeof PhoneIcon> = {
  call: PhoneIcon,
  email: EnvelopeIcon,
  whatsapp: ChatBubbleLeftRightIcon,
  meeting: UserGroupIcon,
  note: PencilSquareIcon,
  stage: FlagIcon,
};

const TIMELINE_LABEL_KEY: Record<TimelineEntryType, string> = {
  call: "@legalos.crm.timeline.call",
  email: "@legalos.crm.timeline.email",
  whatsapp: "@legalos.crm.timeline.whatsapp",
  meeting: "@legalos.crm.timeline.meeting",
  note: "@legalos.crm.timeline.note",
  stage: "@legalos.crm.timeline.stage",
};

const CONFLICT_META = {
  clear: { variant: "success" as const, labelKey: "@legalos.crm.conflict.clear" },
  pending: { variant: "warning" as const, labelKey: "@legalos.crm.conflict.pending" },
  flagged: { variant: "error" as const, labelKey: "@legalos.crm.conflict.flagged" },
};

export default function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslator();
  const { formatEGP, intlLocale } = useFormat();
  const { id } = use(params);
  const lead = getLead(id);

  const [notes, setNotes] = useState<string[]>(lead?.notes ?? []);
  const [draftNote, setDraftNote] = useState("");
  const [consultation, setConsultation] = useState<ConsultationInfo>(
    lead?.consultation ?? { status: "none" }
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleValue, setScheduleValue] = useState<string | undefined>(undefined);

  if (!lead) {
    return (
      <Layout
        height="fill"
        content={
          <LayoutContent padding={0}>
            <EmptyState
              title={t("@legalos.crm.detail.notFoundTitle")}
              description={t("@legalos.crm.detail.notFoundDescription")}
              actions={
                <Link href="/crm" isStandalone>
                  {t("@legalos.crm.detail.backToPipeline")}
                </Link>
              }
            />
          </LayoutContent>
        }
      />
    );
  }

  const stageMeta = STAGE_META[lead.stage];
  const conflictMeta = CONFLICT_META[lead.conflictStatus];

  function addNote() {
    const trimmed = draftNote.trim();
    if (!trimmed) return;
    setNotes((prev) => [trimmed, ...prev]);
    setDraftNote("");
  }

  function confirmSchedule() {
    if (!scheduleValue) return;
    const dt = new Date(scheduleValue);
    setConsultation({
      status: "scheduled",
      date: dt.toLocaleDateString(intlLocale, { weekday: "short", month: "short", day: "numeric" }),
      time: dt.toLocaleTimeString(intlLocale, { hour: "numeric", minute: "2-digit" }),
    });
    setIsScheduling(false);
  }

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <VStack gap={3}>
              <Link href="/crm">
                <HStack gap={1} vAlign="center">
                  <Icon icon={ArrowLeftIcon} size="sm" color="inherit" />
                  {t("@legalos.crm.detail.allLeads")}
                </HStack>
              </Link>

              <HStack hAlign="between" vAlign="start" gap={4}>
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center">
                    <Icon
                      icon={lead.company ? BuildingOffice2Icon : UserIcon}
                      size="md"
                      color="secondary"
                    />
                    <Heading level={2}>{lead.name}</Heading>
                  </HStack>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Badge variant={stageMeta.badgeVariant} label={t(stageMeta.labelKey)} />
                    {lead.conflictStatus !== "clear" && (
                      <Badge variant={conflictMeta.variant} label={t(conflictMeta.labelKey)} />
                    )}
                    <Text type="body" color="secondary">
                      {lead.matterType}
                    </Text>
                  </HStack>
                </VStack>
                <HStack gap={2}>
                  <Button label={t("@legalos.crm.detail.logInteraction")} variant="secondary">
                    {t("@legalos.crm.detail.logInteraction")}
                  </Button>
                  <Button label={t("@legalos.crm.detail.convertToClient")} variant="primary">
                    {t("@legalos.crm.detail.convertToClient")}
                  </Button>
                </HStack>
              </HStack>
            </VStack>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <VStack gap={6}>
                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>{t("@legalos.crm.detail.timeline")}</Heading>
                      <List hasDividers density="compact">
                        {lead.timeline.map((entry, i) => (
                          <ListItem
                            key={`${entry.time}-${i}`}
                            label={`${entry.who} · ${t(TIMELINE_LABEL_KEY[entry.type])}`}
                            description={entry.text}
                            startContent={
                              <Icon icon={TIMELINE_ICON[entry.type]} size="sm" color="secondary" />
                            }
                            endContent={
                              <Text type="supporting" color="secondary">
                                {entry.time}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>{t("@legalos.crm.detail.messagesHeading")}</Heading>
                      {(() => {
                        const logged = lead.timeline.filter(
                          (e) => e.type === "email" || e.type === "whatsapp"
                        );
                        if (logged.length === 0) {
                          return (
                            <EmptyState
                              isCompact
                              title={t("@legalos.crm.detail.messagesEmptyTitle")}
                              description={t("@legalos.crm.detail.messagesEmptyDescription")}
                            />
                          );
                        }
                        return (
                          <List hasDividers density="compact">
                            {logged.map((entry, i) => (
                              <ListItem
                                key={`${entry.time}-${i}`}
                                label={`${entry.who} · ${t(TIMELINE_LABEL_KEY[entry.type])}`}
                                description={entry.text}
                                startContent={
                                  <Icon
                                    icon={TIMELINE_ICON[entry.type]}
                                    size="sm"
                                    color="secondary"
                                  />
                                }
                                endContent={
                                  <Text type="supporting" color="secondary">
                                    {entry.time}
                                  </Text>
                                }
                              />
                            ))}
                          </List>
                        );
                      })()}
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>{t("@legalos.crm.detail.notes")}</Heading>
                      <VStack gap={2}>
                        <TextArea
                          label={t("@legalos.crm.detail.addNoteLabel")}
                          isLabelHidden
                          placeholder={t("@legalos.crm.detail.addNotePlaceholder")}
                          value={draftNote}
                          onChange={setDraftNote}
                          rows={2}
                        />
                        <HStack hAlign="end">
                          <Button
                            label={t("@legalos.crm.detail.addNote")}
                            variant="secondary"
                            size="sm"
                            isDisabled={draftNote.trim().length === 0}
                            onClick={addNote}
                          >
                            {t("@legalos.crm.detail.addNote")}
                          </Button>
                        </HStack>
                      </VStack>
                      {notes.length > 0 && (
                        <>
                          <Divider />
                          <VStack gap={3}>
                            {notes.map((note, i) => (
                              <Text key={i} type="body">
                                {note}
                              </Text>
                            ))}
                          </VStack>
                        </>
                      )}
                    </VStack>
                  </Card>
                </VStack>
              </GridSpan>

              <VStack gap={6}>
                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>{t("@legalos.crm.detail.leadDetails")}</Heading>
                    <MetadataList>
                      <MetadataListItem label={t("@legalos.crm.detail.field.source")} icon={<Icon icon={UserGroupIcon} size="sm" color="secondary" />}>
                        {lead.source}
                      </MetadataListItem>
                      <MetadataListItem label={t("@legalos.crm.detail.field.estimatedValue")} icon={<Icon icon={BanknotesIcon} size="sm" color="secondary" />}>
                        {formatEGP(lead.estValue)}
                      </MetadataListItem>
                      <MetadataListItem label={t("@legalos.crm.detail.field.assignedTo")} icon={<Icon icon={UserIcon} size="sm" color="secondary" />}>
                        {lead.assignedTo}
                      </MetadataListItem>
                      <MetadataListItem label={t("@legalos.crm.detail.field.created")} icon={<Icon icon={CalendarDaysIcon} size="sm" color="secondary" />}>
                        {lead.createdLabel}
                      </MetadataListItem>
                    </MetadataList>
                    {lead.lostReason && (
                      <>
                        <Divider />
                        <Text type="supporting" color="secondary">
                          Lost — {lead.lostReason}
                        </Text>
                      </>
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={ShieldCheckIcon} size="sm" color="secondary" />
                      <Heading level={4}>{t("@legalos.crm.detail.conflictCheck")}</Heading>
                    </HStack>
                    <HStack gap={2} vAlign="center">
                      <StatusDot variant={conflictMeta.variant} label={t(conflictMeta.labelKey)} />
                      <Text type="body" weight="semibold">
                        {t(conflictMeta.labelKey)}
                      </Text>
                    </HStack>
                    <Text type="supporting" color="secondary">
                      {lead.conflictNote}
                    </Text>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={ClockIcon} size="sm" color="secondary" />
                      <Heading level={4}>{t("@legalos.crm.detail.consultation")}</Heading>
                    </HStack>

                    {consultation.status === "completed" && (
                      <HStack hAlign="between" vAlign="center">
                        <Text type="body">
                          Held {consultation.date} at {consultation.time}
                        </Text>
                        <Badge variant="neutral" label={t("@legalos.crm.detail.completed")} />
                      </HStack>
                    )}

                    {consultation.status === "scheduled" && (
                      <HStack hAlign="between" vAlign="center">
                        <Text type="body">
                          {consultation.date} at {consultation.time}
                        </Text>
                        <Badge variant="info" label={t("@legalos.crm.detail.scheduled")} />
                      </HStack>
                    )}

                    {consultation.status === "none" && !isScheduling && (
                      <VStack gap={3}>
                        <Text type="supporting" color="secondary">
                          {t("@legalos.crm.detail.noConsultation")}
                        </Text>
                        <Button
                          label={t("@legalos.crm.detail.scheduleConsultation")}
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsScheduling(true)}
                        >
                          {t("@legalos.crm.detail.scheduleConsultation")}
                        </Button>
                      </VStack>
                    )}

                    {isScheduling && (
                      <VStack gap={3}>
                        <DateTimeInput
                          label={t("@legalos.crm.detail.consultationDateLabel")}
                          value={scheduleValue as never}
                          onChange={(v) => setScheduleValue(v)}
                        />
                        <HStack gap={2}>
                          <Button
                            label={t("@legalos.crm.detail.confirm")}
                            variant="primary"
                            size="sm"
                            isDisabled={!scheduleValue}
                            onClick={confirmSchedule}
                          >
                            {t("@legalos.crm.detail.confirm")}
                          </Button>
                          <Button
                            label={t("@legalos.crm.detail.cancel")}
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsScheduling(false)}
                          >
                            {t("@legalos.crm.detail.cancel")}
                          </Button>
                        </HStack>
                      </VStack>
                    )}
                  </VStack>
                </Card>

                <Card variant="purple">
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={SparklesIcon} size="sm" className="text-purple-vivid" />
                      <Heading level={4}>{t("@legalos.crm.detail.askAi")}</Heading>
                    </HStack>
                    <Text type="body">
                      {t("@legalos.crm.detail.askAiPrompt", {
                        name: lead.name,
                        matterType: lead.matterType.toLowerCase(),
                      })}
                    </Text>
                    <Button label={t("@legalos.crm.detail.draftFollowUp")} variant="secondary" size="sm">
                      {t("@legalos.crm.detail.draftFollowUp")}
                    </Button>
                  </VStack>
                </Card>
              </VStack>
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
