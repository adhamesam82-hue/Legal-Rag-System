"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { List, ListItem } from "@astryxdesign/core/List";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  daysUntil,
  formatDate,
  label,
  todayIso,
  type ISODateString,
  type Priority,
  type Task,
} from "@/lib/practice";

type Filter = "mine" | "all" | "overdue";

export default function TasksPage() {
  const { practice, members } = useOrg();
  const memberName = useMemberName();
  const [filter, setFilter] = useState<Filter>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resource = useResource((api) => api.tasks.list(), []);
  const me = useResource((api) => api.me(), []);

  const tasks = resource.data ?? [];
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => daysUntil(t.due_date) < 0);
  const dueThisWeek = open.filter((t) => {
    const days = daysUntil(t.due_date);
    return days >= 0 && days <= 7;
  });

  const visible = useMemo(() => {
    const rows =
      filter === "mine"
        ? tasks.filter((t) => t.assignee === me.data?.clerk_user_id)
        : filter === "overdue"
          ? overdue
          : tasks;
    // Undated tasks sort last rather than ahead of everything.
    return [...rows].sort((a, b) =>
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filter, me.data]);

  async function toggle(task: Task, complete: boolean) {
    if (!practice) return;
    setPendingId(task.id);
    setError(null);
    try {
      await practice.tasks.update(task.id, {
        status: complete ? "done" : "todo",
      });
      resource.reload();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not update this task.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={0}>
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
                <VStack gap={1}>
                  <Heading level={2}>Tasks</Heading>
                  <Text type="body" color="secondary">
                    {open.length} open across the firm · {overdue.length} overdue
                  </Text>
                </VStack>
                <Button
                  label="Add task"
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                  isDisabled={!practice}
                >
                  Add task
                </Button>
              </HStack>
              <SegmentedControl
                value={filter}
                onChange={(v) => setFilter(v as Filter)}
                label="Filter tasks"
              >
                <SegmentedControlItem value="all" label="All tasks" />
                <SegmentedControlItem value="mine" label="Assigned to me" />
                <SegmentedControlItem value="overdue" label="Overdue" />
              </SegmentedControl>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent padding={0} isScrollable>
            <DataView resource={resource} loadingLabel="Loading tasks…">
              {() => (
                <VStack gap={6}>
                  <InlineError message={error} onDismiss={() => setError(null)} />
                  <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          Open tasks
                        </Text>
                        <Heading level={2}>{open.length}</Heading>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          Due this week
                        </Text>
                        <Heading level={2}>{dueThisWeek.length}</Heading>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Text type="label" color="secondary">
                          Overdue
                        </Text>
                        <Heading level={2}>{overdue.length}</Heading>
                      </VStack>
                    </Card>
                  </Grid>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>
                        {filter === "mine"
                          ? "Assigned to me"
                          : filter === "overdue"
                            ? "Overdue"
                            : "All tasks"}
                      </Heading>
                      {visible.length === 0 ? (
                        <EmptyState
                          title={filter === "overdue" ? "Nothing overdue" : "No tasks"}
                          description={
                            filter === "overdue"
                              ? "Every task is on schedule."
                              : "Tasks assigned across the firm will appear here."
                          }
                        />
                      ) : (
                        <List hasDividers density="compact">
                          {visible.map((task) => {
                            const complete = task.status === "done";
                            const isOverdue =
                              daysUntil(task.due_date) < 0 && !complete;
                            const assignee = memberName(task.assignee);
                            return (
                              <ListItem
                                key={task.id}
                                label={task.title}
                                description={
                                  <HStack gap={2} vAlign="center" wrap="wrap">
                                    {task.matter_id && (
                                      <Link href={`/matters/${task.matter_id}`}>
                                        {task.matter_name}
                                      </Link>
                                    )}
                                    <Text type="supporting" color="secondary">
                                      · {assignee}
                                      {task.due_date
                                        ? ` · due ${formatDate(task.due_date)}`
                                        : " · no due date"}
                                    </Text>
                                  </HStack>
                                }
                                startContent={
                                  <CheckboxInput
                                    label={`Mark "${task.title}" complete`}
                                    isLabelHidden
                                    value={complete}
                                    isDisabled={pendingId === task.id}
                                    onChange={(selected) => toggle(task, selected)}
                                  />
                                }
                                endContent={
                                  <HStack gap={3} vAlign="center">
                                    {isOverdue ? (
                                      <Badge variant="error" label="Overdue" />
                                    ) : task.priority === "high" && !complete ? (
                                      <Badge variant="warning" label="High" />
                                    ) : (
                                      <Text type="supporting" color="secondary">
                                        {label(task.status)}
                                      </Text>
                                    )}
                                    <Avatar name={assignee} size="sm" tooltip={false} />
                                  </HStack>
                                }
                              />
                            );
                          })}
                        </List>
                      )}
                    </VStack>
                  </Card>
                </VStack>
              )}
            </DataView>
          </LayoutContent>
        }
      />
      <NewTaskDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={resource.reload}
        defaultAssignee={me.data?.clerk_user_id ?? members[0]?.clerk_user_id ?? null}
      />
    </>
  );
}

function NewTaskDialog({
  isOpen,
  onOpenChange,
  onCreated,
  defaultAssignee,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultAssignee: string | null;
}) {
  const { practice, members } = useOrg();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string | null>(defaultAssignee);
  const [matterId, setMatterId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<ISODateString>(todayIso);
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matters = useResource(
    (api) => (isOpen ? api.matters.list({ status: "active" }) : Promise.resolve([])),
    [isOpen],
  );

  async function submit() {
    if (!practice || !title.trim() || !(assignee ?? defaultAssignee)) return;
    setSaving(true);
    setError(null);
    try {
      await practice.tasks.create({
        title: title.trim(),
        assignee: assignee ?? defaultAssignee,
        matter_id: matterId ? Number(matterId) : null,
        due_date: dueDate,
        priority,
      });
      setTitle("");
      setMatterId(null);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not create this task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title="Add task" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <TextInput
                label="Task"
                value={title}
                onChange={setTitle}
                placeholder="Draft appeal brief"
                isRequired
              />
              <Selector
                label="Matter"
                hasClear
                value={matterId}
                onChange={setMatterId}
                placeholder="Not tied to a matter"
                options={(matters.data ?? []).map((m) => ({
                  value: String(m.id),
                  label: m.name,
                }))}
              />
              <HStack gap={3}>
                <Selector
                  label="Assignee"
                  hasClear
                  value={assignee ?? defaultAssignee}
                  onChange={setAssignee}
                  options={members.map((m) => ({
                    value: m.clerk_user_id,
                    label: m.display_name ?? m.clerk_user_id,
                  }))}
                />
                <Selector
                  label="Priority"
                  value={priority}
                  onChange={(v) => setPriority((v as Priority) ?? "medium")}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </HStack>
              <DateInput
                label="Due"
                value={dueDate}
                onChange={(v) => setDueDate(v ?? dueDate)}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label="Cancel"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? "Saving…" : "Add task"}
                variant="primary"
                onClick={submit}
                isDisabled={saving || !title.trim()}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
