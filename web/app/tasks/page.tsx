"use client";

/**
 * Tasks page (T-053 / Wave 2).
 *
 * This route manages practice tasks: personal, firm-wide, and overdue.
 *
 * All state, hooks, and practice contract bindings are preserved verbatim.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { useTranslator } from "@astryxdesign/core/i18n";
import { memberLabel, useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  daysUntil,
  todayIso,
  type Priority,
  type Task,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useEnumLabel } from "@/lib/i18n/enum-label";

type Filter = "mine" | "all" | "overdue";

export default function TasksPage() {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
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
      setError(exc instanceof Error ? exc.message : t("@legalos.tasks.updateError"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {t("@legalos.tasks.heading")}
          </h1>
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
            disabled={!practice}
            startIcon={<Icon name="add" size={16} />}
          >
            {t("@legalos.tasks.addTask")}
          </Button>
        </div>

        {/* Filter buttons / Segmented control */}
        <div
          role="radiogroup"
          aria-label={t("@legalos.tasks.filterAriaLabel")}
          className="inline-flex p-1 rounded-lg border max-w-fit"
          style={{
            backgroundColor: "var(--surface2)",
            borderColor: "var(--border)",
            borderRadius: "var(--rs)",
          }}
        >
          {(
            [
              { key: "all", label: t("@legalos.tasks.filter.all") },
              { key: "mine", label: t("@legalos.tasks.filter.mine") },
              { key: "overdue", label: t("@legalos.tasks.filter.overdue") },
            ] as const
          ).map((item) => {
            const isActive = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setFilter(item.key)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  borderRadius: "calc(var(--rs) - 2px)",
                  backgroundColor: isActive ? "var(--surface)" : "transparent",
                  color: isActive ? "var(--text)" : "var(--text2)",
                  boxShadow: isActive ? "0 1px 2px rgba(0, 0, 0, 0.06)" : "none",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <DataView resource={resource} loadingLabel={t("@legalos.tasks.loading")}>
        {() => (
          <div className="flex flex-col gap-6">
            <InlineError message={error} onDismiss={() => setError(null)} />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <div className="flex flex-col gap-1 p-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                    {t("@legalos.tasks.stat.open")}
                  </span>
                  <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                    {open.length}
                  </span>
                </div>
              </Card>
              <Card>
                <div className="flex flex-col gap-1 p-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                    {t("@legalos.tasks.stat.dueThisWeek")}
                  </span>
                  <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                    {dueThisWeek.length}
                  </span>
                </div>
              </Card>
              <Card>
                <div className="flex flex-col gap-1 p-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                    {t("@legalos.tasks.stat.overdue")}
                  </span>
                  <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                    {overdue.length}
                  </span>
                </div>
              </Card>
            </div>

            {/* Tasks List */}
            <Card>
              <div className="flex flex-col gap-4 p-2">
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {filter === "mine"
                    ? t("@legalos.tasks.filter.mine")
                    : filter === "overdue"
                      ? t("@legalos.tasks.filter.overdue")
                      : t("@legalos.tasks.filter.all")}
                </h2>

                {visible.length === 0 ? (
                  <EmptyState
                    icon="checklist"
                    title={
                      filter === "overdue"
                        ? t("@legalos.tasks.empty.overdueTitle")
                        : t("@legalos.tasks.empty.noneTitle")
                    }
                    description={
                      filter === "overdue"
                        ? t("@legalos.tasks.empty.overdueDescription")
                        : t("@legalos.distinction.tasks.emptyDescription")
                    }
                  />
                ) : (
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {visible.map((task) => {
                      const complete = task.status === "done";
                      const isOverdue = daysUntil(task.due_date) < 0 && !complete;
                      const assignee = memberName(task.assignee);

                      return (
                        <div
                          key={task.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2 transition-colors hover:bg-[var(--surface2)]"
                          style={{ borderRadius: "var(--rs)" }}
                        >
                          {/* Checkbox and Task Details */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="pt-0.5">
                              <Checkbox
                                aria-label={t("@legalos.tasks.markComplete", { title: task.title })}
                                checked={complete}
                                disabled={pendingId === task.id}
                                onChange={(e) => toggle(task, e.target.checked)}
                              />
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span
                                className={`text-sm font-medium leading-snug ${
                                  complete ? "line-through" : ""
                                }`}
                                style={{
                                  color: complete ? "var(--text3)" : "var(--text)",
                                }}
                              >
                                {task.title}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text2)" }}>
                                {task.matter_id && (
                                  <Link
                                    href={`/matters/${task.matter_id}`}
                                    className="font-medium hover:underline"
                                    style={{ color: "var(--primary)" }}
                                  >
                                    {task.matter_name}
                                  </Link>
                                )}
                                <span>
                                  {t("@legalos.tasks.assigneeLine", { assignee })}
                                </span>
                                <span>•</span>
                                <span>
                                  {task.due_date
                                    ? t("@legalos.tasks.dueOn", {
                                        date: formatDate(task.due_date),
                                      })
                                    : t("@legalos.tasks.noDueDate")}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Badges and Assignee Avatar */}
                          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                            {isOverdue ? (
                              <Badge color="danger" variant="soft">
                                {t("@legalos.tasks.badge.overdue")}
                              </Badge>
                            ) : task.priority === "high" && !complete ? (
                              <Badge color="warn" variant="soft">
                                {t("@legalos.tasks.badge.high")}
                              </Badge>
                            ) : (
                              <span className="text-xs" style={{ color: "var(--text3)" }}>
                                {enumLabel(task.status)}
                              </span>
                            )}

                            {/* Avatar */}
                            <div
                              title={assignee}
                              className="flex items-center justify-center w-7 h-7 text-xs font-semibold rounded-full select-none border shrink-0"
                              style={{
                                backgroundColor: "var(--surface3)",
                                borderColor: "var(--border)",
                                color: "var(--text2)",
                              }}
                            >
                              {assignee ? assignee.slice(0, 2).toUpperCase() : "?"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </DataView>

      <NewTaskDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={resource.reload}
        defaultAssignee={me.data?.clerk_user_id ?? members[0]?.clerk_user_id ?? null}
      />
    </div>
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
  const t = useTranslator();
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
        assignee: (assignee ?? defaultAssignee) as string,
        matter_id: matterId ? Number(matterId) : null,
        due_date: dueDate,
        priority,
      });
      setTitle("");
      setMatterId(null);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.tasks.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={500}>
      <DialogHeader
        title={t("@legalos.tasks.dialog.title")}
        onOpenChange={onOpenChange}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DialogContent>
          <div className="flex flex-col gap-4">
            <InlineError message={error} onDismiss={() => setError(null)} />
            <Input
              label={t("@legalos.tasks.dialog.taskLabel")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("@legalos.tasks.dialog.taskPlaceholder")}
              required
            />
            <Select
              label={t("@legalos.tasks.dialog.matterLabel")}
              value={matterId ?? ""}
              onChange={(e) => setMatterId(e.target.value || null)}
              options={[
                { value: "", label: t("@legalos.tasks.dialog.matterPlaceholder") },
                ...(matters.data ?? []).map((m) => ({
                  value: String(m.id),
                  label: m.name,
                })),
              ]}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label={t("@legalos.tasks.dialog.assigneeLabel")}
                value={assignee ?? defaultAssignee ?? ""}
                onChange={(e) => setAssignee(e.target.value || null)}
                options={members.map((m) => ({
                  value: m.clerk_user_id,
                  label: memberLabel(m),
                }))}
              />
              <Select
                label={t("@legalos.tasks.dialog.priorityLabel")}
                value={priority}
                onChange={(e) => setPriority((e.target.value as Priority) ?? "medium")}
                options={[
                  { value: "low", label: t("@legalos.tasks.priority.low") },
                  { value: "medium", label: t("@legalos.tasks.priority.medium") },
                  { value: "high", label: t("@legalos.tasks.priority.high") },
                ]}
              />
            </div>
            <Input
              type="date"
              label={t("@legalos.tasks.dialog.dueLabel")}
              value={dueDate}
              onChange={(e) => setDueDate((e.target.value || todayIso) as ISODateString)}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("@legalos.tasks.dialog.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving || !title.trim()}
            >
              {t("@legalos.tasks.addTask")}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

