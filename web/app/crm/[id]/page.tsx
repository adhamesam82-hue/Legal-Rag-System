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
import {
  getLead,
  STAGE_META,
  formatEGP,
  type TimelineEntryType,
  type ConsultationInfo,
} from "../data";

const TIMELINE_ICON: Record<TimelineEntryType, typeof PhoneIcon> = {
  call: PhoneIcon,
  email: EnvelopeIcon,
  whatsapp: ChatBubbleLeftRightIcon,
  meeting: UserGroupIcon,
  note: PencilSquareIcon,
  stage: FlagIcon,
};

const TIMELINE_LABEL: Record<TimelineEntryType, string> = {
  call: "Call",
  email: "Email",
  whatsapp: "WhatsApp",
  meeting: "Meeting",
  note: "Note",
  stage: "Pipeline",
};

const CONFLICT_META = {
  clear: { variant: "success" as const, label: "No conflicts found" },
  pending: { variant: "warning" as const, label: "Conflict check in progress" },
  flagged: { variant: "error" as const, label: "Potential conflict — review required" },
};

export default function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
              title="Lead not found"
              description="This lead may have been removed or the link is out of date."
              actions={
                <Link href="/crm" isStandalone>
                  Back to pipeline
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
      date: dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      time: dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
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
                  All leads
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
                    <Badge variant={stageMeta.badgeVariant} label={stageMeta.label} />
                    {lead.conflictStatus !== "clear" && (
                      <Badge variant={conflictMeta.variant} label={conflictMeta.label} />
                    )}
                    <Text type="body" color="secondary">
                      {lead.matterType}
                    </Text>
                  </HStack>
                </VStack>
                <HStack gap={2}>
                  <Button label="Log interaction" variant="secondary">
                    Log interaction
                  </Button>
                  <Button label="Convert to client" variant="primary">
                    Convert to client
                  </Button>
                </HStack>
              </HStack>
            </VStack>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <VStack gap={6}>
                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>Timeline</Heading>
                      <List hasDividers density="compact">
                        {lead.timeline.map((entry, i) => (
                          <ListItem
                            key={`${entry.time}-${i}`}
                            label={`${entry.who} · ${TIMELINE_LABEL[entry.type]}`}
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
                      <Heading level={4}>Emails &amp; WhatsApp messages</Heading>
                      {(() => {
                        const logged = lead.timeline.filter(
                          (e) => e.type === "email" || e.type === "whatsapp"
                        );
                        if (logged.length === 0) {
                          return (
                            <EmptyState
                              isCompact
                              title="No messages logged"
                              description="Emails and WhatsApp messages logged for this lead appear here."
                            />
                          );
                        }
                        return (
                          <List hasDividers density="compact">
                            {logged.map((entry, i) => (
                              <ListItem
                                key={`${entry.time}-${i}`}
                                label={`${entry.who} · ${TIMELINE_LABEL[entry.type]}`}
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
                      <Heading level={4}>Notes</Heading>
                      <VStack gap={2}>
                        <TextArea
                          label="Add a note"
                          isLabelHidden
                          placeholder="Add a note about this lead…"
                          value={draftNote}
                          onChange={setDraftNote}
                          rows={2}
                        />
                        <HStack hAlign="end">
                          <Button
                            label="Add note"
                            variant="secondary"
                            size="sm"
                            isDisabled={draftNote.trim().length === 0}
                            onClick={addNote}
                          >
                            Add note
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
                    <Heading level={4}>Lead details</Heading>
                    <MetadataList>
                      <MetadataListItem label="Source" icon={<Icon icon={UserGroupIcon} size="sm" color="secondary" />}>
                        {lead.source}
                      </MetadataListItem>
                      <MetadataListItem label="Estimated value" icon={<Icon icon={BanknotesIcon} size="sm" color="secondary" />}>
                        {formatEGP(lead.estValue)}
                      </MetadataListItem>
                      <MetadataListItem label="Assigned to" icon={<Icon icon={UserIcon} size="sm" color="secondary" />}>
                        {lead.assignedTo}
                      </MetadataListItem>
                      <MetadataListItem label="Created" icon={<Icon icon={CalendarDaysIcon} size="sm" color="secondary" />}>
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
                      <Heading level={4}>Conflict check</Heading>
                    </HStack>
                    <HStack gap={2} vAlign="center">
                      <StatusDot variant={conflictMeta.variant} label={conflictMeta.label} />
                      <Text type="body" weight="semibold">
                        {conflictMeta.label}
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
                      <Heading level={4}>Consultation</Heading>
                    </HStack>

                    {consultation.status === "completed" && (
                      <HStack hAlign="between" vAlign="center">
                        <Text type="body">
                          Held {consultation.date} at {consultation.time}
                        </Text>
                        <Badge variant="neutral" label="Completed" />
                      </HStack>
                    )}

                    {consultation.status === "scheduled" && (
                      <HStack hAlign="between" vAlign="center">
                        <Text type="body">
                          {consultation.date} at {consultation.time}
                        </Text>
                        <Badge variant="info" label="Scheduled" />
                      </HStack>
                    )}

                    {consultation.status === "none" && !isScheduling && (
                      <VStack gap={3}>
                        <Text type="supporting" color="secondary">
                          No consultation scheduled yet.
                        </Text>
                        <Button
                          label="Schedule consultation"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsScheduling(true)}
                        >
                          Schedule consultation
                        </Button>
                      </VStack>
                    )}

                    {isScheduling && (
                      <VStack gap={3}>
                        <DateTimeInput
                          label="Consultation date and time"
                          value={scheduleValue as never}
                          onChange={(v) => setScheduleValue(v)}
                        />
                        <HStack gap={2}>
                          <Button
                            label="Confirm"
                            variant="primary"
                            size="sm"
                            isDisabled={!scheduleValue}
                            onClick={confirmSchedule}
                          >
                            Confirm
                          </Button>
                          <Button
                            label="Cancel"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsScheduling(false)}
                          >
                            Cancel
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
                      <Heading level={4}>Ask AI</Heading>
                    </HStack>
                    <Text type="body">
                      Draft a follow-up email to {lead.name} summarizing next steps for{" "}
                      {lead.matterType.toLowerCase()}.
                    </Text>
                    <Button label="Draft follow-up" variant="secondary" size="sm">
                      Draft follow-up
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
