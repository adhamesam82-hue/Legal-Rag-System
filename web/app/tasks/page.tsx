"use client";

import { useState } from "react";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
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
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { PlusIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  TASKS,
  matterById,
  teamMember,
  formatDate,
  daysUntil,
  CURRENT_USER_ID,
} from "@/lib/legalos-data";

type Filter = "mine" | "all" | "overdue";

export default function TasksPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [done, setDone] = useState<Record<string, boolean>>({});

  const isDone = (id: string, status: string) => done[id] ?? status === "Done";

  const visible = TASKS.filter((t) => {
    if (filter === "mine") return t.assigneeId === CURRENT_USER_ID;
    if (filter === "overdue") return daysUntil(t.dueDate) < 0 && !isDone(t.id, t.status);
    return true;
  }).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  const openCount = TASKS.filter((t) => !isDone(t.id, t.status)).length;
  const overdueCount = TASKS.filter(
    (t) => daysUntil(t.dueDate) < 0 && !isDone(t.id, t.status),
  ).length;
  const dueThisWeek = TASKS.filter((t) => {
    const d = daysUntil(t.dueDate);
    return d >= 0 && d <= 7 && !isDone(t.id, t.status);
  }).length;

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
              <VStack gap={1}>
                <Heading level={2}>Tasks</Heading>
                <Text type="body" color="secondary">
                  {openCount} open across the firm · {overdueCount} overdue
                </Text>
              </VStack>
              <Button
                label="Add task"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
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
          <VStack gap={6}>
            <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Open tasks
                  </Text>
                  <Heading level={2}>{openCount}</Heading>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Due this week
                  </Text>
                  <Heading level={2}>{dueThisWeek}</Heading>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Overdue
                  </Text>
                  <Heading level={2}>{overdueCount}</Heading>
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
                    {visible.map((t) => {
                      const matter = matterById(t.matterId);
                      const assignee = teamMember(t.assigneeId);
                      const complete = isDone(t.id, t.status);
                      const overdue = daysUntil(t.dueDate) < 0 && !complete;
                      return (
                        <ListItem
                          key={t.id}
                          label={t.title}
                          description={
                            <HStack gap={2} vAlign="center" wrap="wrap">
                              {matter && (
                                <Link href={`/matters/${matter.id}`}>{matter.name}</Link>
                              )}
                              <Text type="supporting" color="secondary">
                                · {assignee.name} · due {formatDate(t.dueDate)}
                              </Text>
                            </HStack>
                          }
                          startContent={
                            <CheckboxInput label={`Mark "${t.title}" complete`} isLabelHidden value={complete} onChange={(sel) => setDone((p) => ({ ...p, [t.id]: sel }))} />
                          }
                          endContent={
                            <HStack gap={3} vAlign="center">
                              {overdue ? (
                                <Badge variant="error" label="Overdue" />
                              ) : t.priority === "High" && !complete ? (
                                <Badge variant="warning" label="High" />
                              ) : (
                                <Text type="supporting" color="secondary">
                                  {complete ? "Done" : t.status}
                                </Text>
                              )}
                              <Avatar name={assignee.name} size="sm" tooltip={false} />
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
        </LayoutContent>
      }
    />
  );
}
