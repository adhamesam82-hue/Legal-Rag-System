"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { TextArea } from "@astryxdesign/core/TextArea";
import {
  ArrowLeftIcon,
  ScaleIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  CreditCardIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import {
  matterById,
  clientById,
  caseForMatter,
  teamMember,
  documentsForMatter,
  hearingsForMatter,
  tasksForMatter,
  timeEntriesForMatter,
  invoicesForMatter,
  notesForMatter,
  activityForMatter,
  timelineForMatter,
  MATTER_AI_INSIGHTS,
  MATTER_AI_CONVERSATION,
  formatEGP,
  formatDate,
  daysUntil,
} from "@/lib/legalos-data";

const AI_ICON_CLASS = "text-purple-vivid";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "documents", label: "Documents" },
  { value: "hearings", label: "Hearings" },
  { value: "tasks", label: "Tasks" },
  { value: "invoices", label: "Invoices" },
  { value: "time", label: "Time Entries" },
  { value: "ai", label: "AI Assistant" },
  { value: "notes", label: "Notes" },
  { value: "evidence", label: "Evidence" },
  { value: "activity", label: "Activity" },
];

function statusVariant(status: string): "success" | "warning" | "neutral" {
  if (status === "Active") return "success";
  if (status === "On Hold") return "warning";
  return "neutral";
}

export default function MatterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tab, setTab] = useState("overview");
  const [draft, setDraft] = useState("");

  const matter = matterById(id);
  if (!matter) {
    notFound();
  }

  const client = clientById(matter.clientId);
  const caseRecord = caseForMatter(matter.id);
  const lead = teamMember(matter.responsibleLawyerId);
  const documents = documentsForMatter(matter.id);
  const hearings = hearingsForMatter(matter.id);
  const tasks = tasksForMatter(matter.id);
  const timeEntries = timeEntriesForMatter(matter.id);
  const invoices = invoicesForMatter(matter.id);
  const notes = notesForMatter(matter.id);
  const activity = activityForMatter(matter.id);
  const timeline = timelineForMatter(matter.id);
  const insights = MATTER_AI_INSIGHTS.filter((i) => i.matterId === matter.id);
  const conversation = MATTER_AI_CONVERSATION.filter((m) => m.matterId === matter.id);

  const openTasks = tasks.filter((t) => t.status !== "Done");
  const totalHours = timeEntries.reduce((sum, t) => sum + t.hours, 0);
  const billedValue = timeEntries
    .filter((t) => t.billable)
    .reduce((sum, t) => sum + t.hours * t.rate, 0);
  const outstanding = invoices
    .filter((i) => i.status === "Sent" || i.status === "Overdue")
    .reduce((sum, i) => sum + i.amount, 0);
  const nextHearing = hearings.find((h) => !h.outcome);

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={4}>
            <Link href="/matters" color="secondary">
              <HStack gap={1} vAlign="center">
                <Icon icon={ArrowLeftIcon} size="xsm" color="inherit" />
                <Text type="supporting" color="inherit">
                  All matters
                </Text>
              </HStack>
            </Link>

            <HStack hAlign="between" vAlign="start" wrap="wrap" gap={4}>
              <VStack gap={2}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <Heading level={2}>{matter.name}</Heading>
                  <Badge variant={statusVariant(matter.status)} label={matter.status} />
                </HStack>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  {client && <Link href={`/clients/${client.id}`}>{client.name}</Link>}
                  <Text type="supporting" color="secondary">
                    · {matter.type} · Opened {formatDate(matter.openedDate)}
                  </Text>
                </HStack>
              </VStack>
              <HStack gap={2}>
                <Button
                  label="Ask AI about this matter"
                  variant="secondary"
                  icon={<Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />}
                  onClick={() => setTab("ai")}
                >
                  Ask AI
                </Button>
                <Button label="Log time" variant="secondary" icon={<Icon icon={ClockIcon} size="sm" />}>
                  Log time
                </Button>
                <Button label="Edit matter" variant="primary">
                  Edit matter
                </Button>
              </HStack>
            </HStack>

            <TabList value={tab} onChange={setTab} hasDivider>
              {TABS.map((t) => (
                <Tab
                  key={t.value}
                  value={t.value}
                  label={t.label}
                  endContent={
                    t.value === "tasks" && openTasks.length > 0 ? (
                      <Badge variant="neutral" label={String(openTasks.length)} />
                    ) : undefined
                  }
                />
              ))}
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            {tab === "overview" && (
              <Grid columns={3} gap={6}>
                <GridSpan columns={2}>
                  <VStack gap={6}>
                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>Summary</Heading>
                        <Text type="body">{matter.description}</Text>
                        <Divider />
                        <MetadataList columns="multi">
                          <MetadataListItem label="Client">{client?.name ?? "—"}</MetadataListItem>
                          <MetadataListItem label="Matter type">{matter.type}</MetadataListItem>
                          <MetadataListItem label="Responsible lawyer">{lead.name}</MetadataListItem>
                          <MetadataListItem label="Billing">{matter.billingType}</MetadataListItem>
                          <MetadataListItem label="Opened">{formatDate(matter.openedDate)}</MetadataListItem>
                          <MetadataListItem label="Budget">{matter.budget ?? "Not set"}</MetadataListItem>
                        </MetadataList>
                      </VStack>
                    </Card>

                    {caseRecord && (
                      <Card>
                        <VStack gap={4}>
                          <HStack hAlign="between" vAlign="center">
                            <Heading level={4}>Linked court case</Heading>
                            <Link href={`/cases/${caseRecord.id}`}>Open case</Link>
                          </HStack>
                          <MetadataList columns="multi">
                            <MetadataListItem label="Case number">{caseRecord.caseNumber}</MetadataListItem>
                            <MetadataListItem label="Court">{caseRecord.court}</MetadataListItem>
                            <MetadataListItem label="Judge">{caseRecord.judge}</MetadataListItem>
                            <MetadataListItem label="Opposing party">{caseRecord.opposingParty}</MetadataListItem>
                          </MetadataList>
                        </VStack>
                      </Card>
                    )}

                    <Card>
                      <VStack gap={4}>
                        <HStack hAlign="between" vAlign="center">
                          <Heading level={4}>Open tasks</Heading>
                          <Link href="/tasks">All tasks</Link>
                        </HStack>
                        {openTasks.length === 0 ? (
                          <EmptyState
                            title="No open tasks"
                            description="Every task on this matter is complete."
                          />
                        ) : (
                          <List hasDividers density="compact">
                            {openTasks.map((t) => (
                              <ListItem
                                key={t.id}
                                label={t.title}
                                description={`${teamMember(t.assigneeId).name} · due ${formatDate(t.dueDate)}`}
                                startContent={<Icon icon={CheckCircleIcon} size="sm" color="secondary" />}
                                endContent={
                                  t.priority === "High" ? (
                                    <Badge variant="warning" label="High" />
                                  ) : (
                                    <Text type="supporting" color="secondary">
                                      {t.priority}
                                    </Text>
                                  )
                                }
                              />
                            ))}
                          </List>
                        )}
                      </VStack>
                    </Card>
                  </VStack>
                </GridSpan>

                <VStack gap={6}>
                  <Card variant="purple">
                    <VStack gap={3}>
                      <HStack gap={2} vAlign="center">
                        <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                        <Heading level={4}>AI insights</Heading>
                      </HStack>
                      {insights.map((i, idx) => (
                        <VStack key={i.insight} gap={3}>
                          {idx > 0 && <Divider />}
                          <Text type="body">{i.insight}</Text>
                        </VStack>
                      ))}
                      <Button
                        label="Open matter AI assistant"
                        variant="secondary"
                        size="sm"
                        onClick={() => setTab("ai")}
                      >
                        Ask a follow-up
                      </Button>
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>At a glance</Heading>
                      <MetadataList>
                        <MetadataListItem label="Next deadline">
                          {matter.nextDeadline
                            ? `${matter.nextDeadline.label} — in ${daysUntil(matter.nextDeadline.date)}d`
                            : "None set"}
                        </MetadataListItem>
                        <MetadataListItem label="Next hearing">
                          {nextHearing
                            ? `${formatDate(nextHearing.date)}, ${nextHearing.time}`
                            : "None scheduled"}
                        </MetadataListItem>
                        <MetadataListItem label="Time logged">{`${totalHours.toFixed(1)}h`}</MetadataListItem>
                        <MetadataListItem label="Unbilled value">{formatEGP(billedValue)}</MetadataListItem>
                        <MetadataListItem label="Outstanding">{formatEGP(outstanding)}</MetadataListItem>
                        <MetadataListItem label="Documents">{String(documents.length)}</MetadataListItem>
                      </MetadataList>
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>Team</Heading>
                      <List density="compact">
                        <ListItem
                          label={lead.name}
                          description={`${lead.role} · responsible`}
                          startContent={<Avatar name={lead.name} size="sm" tooltip={false} />}
                        />
                        {(matter.supportingStaffIds ?? []).map((sid) => {
                          const m = teamMember(sid);
                          return (
                            <ListItem
                              key={sid}
                              label={m.name}
                              description={m.role}
                              startContent={<Avatar name={m.name} size="sm" tooltip={false} />}
                            />
                          );
                        })}
                      </List>
                    </VStack>
                  </Card>
                </VStack>
              </Grid>
            )}

            {tab === "timeline" && (
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>Matter timeline</Heading>
                  {timeline.length === 0 ? (
                    <EmptyState title="No timeline events" description="Milestones will appear here as the matter progresses." />
                  ) : (
                    <List hasDividers density="balanced">
                      {[...timeline].reverse().map((e) => (
                        <ListItem
                          key={`${e.date}-${e.label}`}
                          label={e.label}
                          description={e.detail}
                          startContent={
                            <Icon
                              icon={
                                e.kind === "filing"
                                  ? ScaleIcon
                                  : e.kind === "billing"
                                    ? CreditCardIcon
                                    : e.kind === "communication"
                                      ? PaperAirplaneIcon
                                      : ArchiveBoxIcon
                              }
                              size="sm"
                              color="secondary"
                            />
                          }
                          endContent={
                            <Text type="supporting" color="secondary">
                              {formatDate(e.date)}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                  )}
                </VStack>
              </Card>
            )}

            {tab === "documents" && (
              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>Documents</Heading>
                    <Button label="Upload document" variant="secondary" size="sm">
                      Upload
                    </Button>
                  </HStack>
                  <List hasDividers density="compact">
                    {documents.map((d) => (
                      <ListItem
                        key={d.id}
                        label={d.name}
                        description={`${d.type} · ${d.size} · ${d.uploadedBy} · ${formatDate(d.uploadedAt)}`}
                        href={`/documents/${d.id}`}
                        startContent={<Icon icon={DocumentTextIcon} size="sm" color="secondary" />}
                        endContent={
                          d.status === "Draft" || d.status === "Under review" ? (
                            <Badge variant="neutral" label={d.status} />
                          ) : (
                            <Text type="supporting" color="secondary">
                              {d.status}
                            </Text>
                          )
                        }
                      />
                    ))}
                  </List>
                </VStack>
              </Card>
            )}

            {tab === "hearings" && (
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>Hearings</Heading>
                  {hearings.length === 0 ? (
                    <EmptyState title="No hearings" description="This matter has no scheduled or past hearings." />
                  ) : (
                    <List hasDividers density="balanced">
                      {hearings.map((h) => (
                        <ListItem
                          key={h.id}
                          label={h.purpose}
                          description={`${h.court}${h.outcome ? ` · ${h.outcome}` : ""}`}
                          startContent={<Icon icon={CalendarDaysIcon} size="sm" color="secondary" />}
                          endContent={
                            <VStack gap={0} align="end">
                              <Text type="label" weight="semibold">
                                {formatDate(h.date)}
                              </Text>
                              <Text type="supporting" color="secondary">
                                {h.time}
                              </Text>
                            </VStack>
                          }
                        />
                      ))}
                    </List>
                  )}
                </VStack>
              </Card>
            )}

            {tab === "tasks" && (
              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>Tasks</Heading>
                    <Button label="Add task" variant="secondary" size="sm">
                      Add task
                    </Button>
                  </HStack>
                  <List hasDividers density="compact">
                    {tasks.map((t) => (
                      <ListItem
                        key={t.id}
                        label={t.title}
                        description={`${teamMember(t.assigneeId).name} · due ${formatDate(t.dueDate)} · ${t.status}`}
                        startContent={
                          <Icon
                            icon={CheckCircleIcon}
                            size="sm"
                            color={t.status === "Done" ? "success" : "secondary"}
                          />
                        }
                        endContent={
                          t.priority === "High" && t.status !== "Done" ? (
                            <Badge variant="warning" label="High" />
                          ) : (
                            <Text type="supporting" color="secondary">
                              {t.priority}
                            </Text>
                          )
                        }
                      />
                    ))}
                  </List>
                </VStack>
              </Card>
            )}

            {tab === "invoices" && (
              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>Invoices</Heading>
                    <Link href="/billing">All billing</Link>
                  </HStack>
                  {invoices.length === 0 ? (
                    <EmptyState title="No invoices" description="Nothing has been invoiced on this matter yet." />
                  ) : (
                    <List hasDividers density="compact">
                      {invoices.map((i) => (
                        <ListItem
                          key={i.id}
                          label={i.number}
                          description={`Issued ${formatDate(i.issuedDate)} · due ${formatDate(i.dueDate)}`}
                          href={`/billing/${i.id}`}
                          startContent={<Icon icon={CreditCardIcon} size="sm" color="secondary" />}
                          endContent={
                            <HStack gap={3} vAlign="center">
                              <Text type="label" weight="semibold">
                                {formatEGP(i.amount)}
                              </Text>
                              {i.status === "Overdue" ? (
                                <Badge variant="error" label="Overdue" />
                              ) : (
                                <Text type="supporting" color="secondary">
                                  {i.status}
                                </Text>
                              )}
                            </HStack>
                          }
                        />
                      ))}
                    </List>
                  )}
                </VStack>
              </Card>
            )}

            {tab === "time" && (
              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <VStack gap={1}>
                      <Heading level={4}>Time entries</Heading>
                      <Text type="supporting" color="secondary">
                        {totalHours.toFixed(1)}h logged · {formatEGP(billedValue)} billable value
                      </Text>
                    </VStack>
                    <Link href="/time-tracking">Open time tracking</Link>
                  </HStack>
                  {timeEntries.length === 0 ? (
                    <EmptyState title="No time logged" description="Start the timer to record work on this matter." />
                  ) : (
                    <List hasDividers density="compact">
                      {timeEntries.map((t) => (
                        <ListItem
                          key={t.id}
                          label={t.description}
                          description={`${teamMember(t.lawyerId).name} · ${formatDate(t.date)}`}
                          startContent={<Icon icon={ClockIcon} size="sm" color="secondary" />}
                          endContent={
                            <HStack gap={3} vAlign="center">
                              <Text type="label" weight="semibold">
                                {t.hours.toFixed(1)}h
                              </Text>
                              {!t.billable && <Badge variant="neutral" label="Non-billable" />}
                            </HStack>
                          }
                        />
                      ))}
                    </List>
                  )}
                </VStack>
              </Card>
            )}

            {tab === "ai" && (
              <Grid columns={3} gap={6}>
                <GridSpan columns={2}>
                  <Card>
                    <VStack gap={4}>
                      <HStack gap={2} vAlign="center">
                        <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                        <Heading level={4}>Matter AI assistant</Heading>
                      </HStack>
                      <Text type="supporting" color="secondary">
                        Scoped to this matter&apos;s documents, filings, and the Egyptian statute corpus.
                        Answers cite the articles they rely on.
                      </Text>
                      <Divider />
                      <VStack gap={4}>
                        {conversation.map((m, idx) => (
                          <VStack key={idx} gap={2}>
                            <HStack gap={2} vAlign="center">
                              {m.role === "user" ? (
                                <Avatar name="Ahmed Al-Sayed" size="sm" tooltip={false} />
                              ) : (
                                <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                              )}
                              <Text type="label" weight="semibold">
                                {m.role === "user" ? "Ahmed Al-Sayed" : "AI Assistant"}
                              </Text>
                            </HStack>
                            <Text type="body">{m.content}</Text>
                          </VStack>
                        ))}
                      </VStack>
                      <Divider />
                      <TextArea
                        label="Ask about this matter"
                        isLabelHidden
                        value={draft}
                        onChange={setDraft}
                        placeholder="Ask about this matter — its documents, deadlines, or the statutes it turns on…"
                        rows={3}
                      />
                      <HStack hAlign="end">
                        <Button
                          label="Send"
                          variant="primary"
                          icon={<Icon icon={PaperAirplaneIcon} size="sm" color="inherit" />}
                        >
                          Send
                        </Button>
                      </HStack>
                    </VStack>
                  </Card>
                </GridSpan>
                <VStack gap={6}>
                  <Card variant="purple">
                    <VStack gap={3}>
                      <Heading level={4}>Suggested</Heading>
                      <Text type="body">Draft the appeal brief section on damages.</Text>
                      <Divider />
                      <Text type="body">Compare the delivery clause against our standard template.</Text>
                      <Divider />
                      <Text type="body">Extract a timeline of filings for the client update.</Text>
                    </VStack>
                  </Card>
                  <Card>
                    <VStack gap={3}>
                      <Heading level={4}>Knowledge sources</Heading>
                      <Text type="supporting" color="secondary">
                        {documents.length} matter documents · Egyptian statute corpus (6,985 articles)
                        {caseRecord ? ` · case file ${caseRecord.caseNumber}` : ""}
                      </Text>
                      <Link href="/knowledge-base">Firm knowledge base</Link>
                    </VStack>
                  </Card>
                </VStack>
              </Grid>
            )}

            {tab === "notes" && (
              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>Notes</Heading>
                    <Button label="Add note" variant="secondary" size="sm" icon={<Icon icon={PencilSquareIcon} size="sm" />}>
                      Add note
                    </Button>
                  </HStack>
                  {notes.length === 0 ? (
                    <EmptyState title="No notes yet" description="Internal notes on this matter will appear here." />
                  ) : (
                    <VStack gap={4}>
                      {notes.map((n, idx) => (
                        <VStack key={n.id} gap={3}>
                          {idx > 0 && <Divider />}
                          <HStack gap={2} vAlign="center">
                            <Avatar name={teamMember(n.authorId).name} size="sm" tooltip={false} />
                            <Text type="label" weight="semibold">
                              {teamMember(n.authorId).name}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {formatDate(n.date)}
                            </Text>
                          </HStack>
                          <Text type="body">{n.content}</Text>
                        </VStack>
                      ))}
                    </VStack>
                  )}
                </VStack>
              </Card>
            )}

            {tab === "evidence" && (
              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>Evidence</Heading>
                    {caseRecord && <Link href={`/cases/${caseRecord.id}`}>Open case file</Link>}
                  </HStack>
                  {!caseRecord || caseRecord.evidence.length === 0 ? (
                    <EmptyState
                      title="No evidence on file"
                      description="Evidence is tracked on litigation matters with a linked court case."
                    />
                  ) : (
                    <List hasDividers density="compact">
                      {caseRecord.evidence.map((e) => (
                        <ListItem
                          key={e.name}
                          label={e.name}
                          description={`${e.type} · submitted by ${e.submittedBy}`}
                          startContent={<Icon icon={ClipboardDocumentListIcon} size="sm" color="secondary" />}
                          endContent={
                            <Text type="supporting" color="secondary">
                              {formatDate(e.date)}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                  )}
                </VStack>
              </Card>
            )}

            {tab === "activity" && (
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>Activity</Heading>
                  {activity.length === 0 ? (
                    <EmptyState title="No activity" description="Actions taken on this matter will appear here." />
                  ) : (
                    <List hasDividers density="compact">
                      {[...activity].reverse().map((a) => (
                        <ListItem
                          key={a.id}
                          label={a.who}
                          description={a.what}
                          startContent={
                            a.who === "AI Assistant" ? (
                              <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                            ) : (
                              <Avatar name={a.who} size="sm" tooltip={false} />
                            )
                          }
                          endContent={
                            <Text type="supporting" color="secondary">
                              {a.when.slice(0, 10)}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                  )}
                </VStack>
              </Card>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
