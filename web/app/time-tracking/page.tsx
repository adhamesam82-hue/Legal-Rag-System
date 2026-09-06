"use client";

/**
 * شاشة تتبع الوقت (Time Tracking) - نظام السجل (LegalOS)
 * الموجة الرابعة من T-053.
 *
 * إعادة رسم الشاشة بالكامل باستخدام مكتبة السجل (components/ui):
 * Card, Button, Badge, Input, Select, Checkbox, Dialog, Table, EmptyState, Icon
 * والتخلص التام من أي مكون بصري من @astryxdesign/core.
 * الحفاظ الصارم على كافة الخطافات والحسابات والمؤقت الحي المحفوظ في localStorage.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  todayIso,
  type ISODateString,
  type Matter,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";

const WEEKLY_TARGET_HOURS = 40;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_KEYS)[number];

const TIMER_STORAGE_KEY = "legalos_active_timer_v1";

interface SavedTimerState {
  isRunning: boolean;
  matterId: string | null;
  description: string;
  baseSeconds: number;
}

/** Monday-anchored week containing `iso`. */
function weekDays(
  iso: string,
  intlLocale: string,
): { dayKey: DayKey; date: string; iso: string }[] {
  const anchor = new Date(`${iso}T00:00:00`);
  const offsetToMonday = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - offsetToMonday);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
    return {
      dayKey: DAY_KEYS[date.getDay()],
      date: date.toLocaleDateString(intlLocale, { month: "short", day: "numeric" }),
      iso: key,
    };
  });
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

interface EntryRow extends Record<string, unknown> {
  id: number;
  date: string;
  rawDate: string;
  matter: string;
  description: string;
  lawyer: string;
  billable: boolean;
  hours: number;
  amount: number;
  invoiced: boolean;
}

export default function TimeTrackingPage() {
  const { formatDate, formatEGP, intlLocale } = useFormat();
  const t = useTranslator();
  const { practice } = useOrg();
  const memberName = useMemberName();
  const [view, setView] = useState<"day" | "week">("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = todayIso();
  const week = useMemo(() => weekDays(today, intlLocale), [today, intlLocale]);
  const weekStart = week[0].iso;
  const weekEnd = week[6].iso;

  const resource = useResource(
    async (api) => {
      const [entries, matters] = await Promise.all([
        api.time.list({ since: weekStart, until: weekEnd }),
        api.matters.list({ status: "active" }),
      ]);
      return { entries, matters };
    },
    [weekStart, weekEnd],
  );

  const entries = resource.data?.entries ?? [];
  const matters = resource.data?.matters ?? [];

  const chartData = useMemo(
    () =>
      week.map((d) => {
        const forDay = entries.filter((e) => e.entry_date === d.iso);
        return {
          day: t(`@legalos.timeTracking.day.${d.dayKey}`),
          billable: forDay
            .filter((e) => e.billable)
            .reduce((sum, e) => sum + Number(e.hours), 0),
          nonBillable: forDay
            .filter((e) => !e.billable)
            .reduce((sum, e) => sum + Number(e.hours), 0),
        };
      }),
    [week, entries, t],
  );

  const visibleEntries = useMemo<EntryRow[]>(() => {
    const day = selectedDay ?? (view === "day" ? today : null);
    return entries
      .filter((e) => !day || e.entry_date === day)
      .map((e) => ({
        id: e.id,
        date: formatDate(e.entry_date),
        rawDate: e.entry_date,
        matter: e.matter_name,
        description: e.description,
        lawyer: memberName(e.clerk_user_id),
        billable: e.billable,
        hours: Number(e.hours),
        amount: e.billable ? Number(e.hours) * Number(e.rate) : 0,
        invoiced: e.invoice_id !== null,
      }));
  }, [entries, selectedDay, view, today, memberName, formatDate]);

  const perMember = useMemo(() => {
    const totals = new Map<string, { billable: number; nonBillable: number }>();
    for (const entry of entries) {
      const current = totals.get(entry.clerk_user_id) ?? {
        billable: 0,
        nonBillable: 0,
      };
      if (entry.billable) current.billable += Number(entry.hours);
      else current.nonBillable += Number(entry.hours);
      totals.set(entry.clerk_user_id, current);
    }
    return [...totals.entries()]
      .map(([userId, hours]) => ({ name: memberName(userId), ...hours }))
      .sort((a, b) => b.billable - a.billable);
  }, [entries, memberName]);

  async function handleDeleteEntry(id: number) {
    if (!practice) return;
    setDeletingId(id);
    setActionError(null);
    try {
      await practice.time.remove(id);
      resource.reload();
    } catch (exc) {
      setActionError(exc instanceof Error ? exc.message : t("@legalos.timeTracking.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* الترويسة الرئيسية */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {t("@legalos.timeTracking.heading")}
          </h1>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.timeTracking.weekOf", {
              start: week[0].date,
              end: week[6].date,
            })}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreating(true)}
          startIcon={<Icon name="add" size={16} />}
        >
          {t("@legalos.timeTracking.newTimeEntry")}
        </Button>
      </div>

      <InlineError message={actionError} onDismiss={() => setActionError(null)} />

      {/* منطقة تحميل وعرض البيانات */}
      <DataView resource={resource} loadingLabel={t("@legalos.timeTracking.loading")}>
        {() => (
          <div className="flex flex-col gap-6">
            {/* الصف العلوي: المؤقت الحي والرسم البياني */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <LiveTimer matters={matters} onLogged={resource.reload} />
              </div>

              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <CardTitle className="text-sm font-semibold">
                        {t("@legalos.timeTracking.chart.heading")}
                      </CardTitle>
                      <span className="text-xs" style={{ color: "var(--text2)" }}>
                        {t("@legalos.timeTracking.chart.thisWeek")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            horizontal
                            vertical={false}
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12, fill: "var(--text2)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tickFormatter={(value: number) => String(Number(value.toFixed(1)))}
                            tick={{ fontSize: 12, fill: "var(--text2)" }}
                            axisLine={false}
                            tickLine={false}
                            width={36}
                          />
                          <Tooltip
                            formatter={(value, name) => [
                              t("@legalos.timeTracking.hoursShort", {
                                hours: Number(value).toFixed(2),
                              }),
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: "var(--surface)",
                              borderColor: "var(--border)",
                              borderRadius: "var(--r)",
                              color: "var(--text)",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text2)" }} />
                          <Bar
                            dataKey="billable"
                            name={t("@legalos.timeTracking.chart.billable")}
                            fill="var(--primary)"
                            radius={[4, 4, 0, 0]}
                            stackId="hours"
                          />
                          <Bar
                            dataKey="nonBillable"
                            name={t("@legalos.timeTracking.chart.nonBillable")}
                            fill="var(--text3)"
                            radius={[4, 4, 0, 0]}
                            stackId="hours"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* بطاقة النظرة العامة على الأسبوع */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4 w-full">
                  <CardTitle className="text-sm font-semibold">
                    {t("@legalos.timeTracking.weekOverview.heading")}
                  </CardTitle>
                  <div
                    role="radiogroup"
                    aria-label={t("@legalos.timeTracking.weekOverview.calendarViewLabel")}
                    className="inline-flex p-1 rounded-lg border max-w-fit"
                    style={{
                      backgroundColor: "var(--surface2)",
                      borderColor: "var(--border)",
                      borderRadius: "var(--rs)",
                    }}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={view === "week"}
                      onClick={() => {
                        setView("week");
                        setSelectedDay(null);
                      }}
                      className="px-3 py-1 text-xs font-medium transition-all"
                      style={{
                        borderRadius: "calc(var(--rs) - 2px)",
                        backgroundColor: view === "week" ? "var(--surface)" : "transparent",
                        color: view === "week" ? "var(--text)" : "var(--text2)",
                        boxShadow: view === "week" ? "var(--shadow-sm)" : "none",
                      }}
                    >
                      {t("@legalos.timeTracking.weekOverview.week")}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={view === "day"}
                      onClick={() => setView("day")}
                      className="px-3 py-1 text-xs font-medium transition-all"
                      style={{
                        borderRadius: "calc(var(--rs) - 2px)",
                        backgroundColor: view === "day" ? "var(--surface)" : "transparent",
                        color: view === "day" ? "var(--text)" : "var(--text2)",
                        boxShadow: view === "day" ? "var(--shadow-sm)" : "none",
                      }}
                    >
                      {t("@legalos.timeTracking.weekOverview.day")}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {week.map((d) => {
                    const total = entries
                      .filter((e) => e.entry_date === d.iso)
                      .reduce((sum, e) => sum + Number(e.hours), 0);
                    const isSelected = selectedDay === d.iso;
                    const isToday = d.iso === today;
                    const dayLabel = t(`@legalos.timeTracking.day.${d.dayKey}`);
                    return (
                      <div
                        key={d.iso}
                        className="flex flex-col justify-between p-3 rounded-lg border transition-all"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--primary-soft)"
                            : isToday
                              ? "var(--surface2)"
                              : "var(--surface)",
                          borderColor: isSelected ? "var(--primary)" : "var(--border)",
                          borderRadius: "var(--rs)",
                        }}
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                              {dayLabel}
                            </span>
                            {isToday && (
                              <Badge variant="soft" color="info" size="sm">
                                {t("@legalos.timeTracking.weekOverview.today")}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs" style={{ color: "var(--text2)" }}>
                            {d.date}
                          </span>
                        </div>

                        <div className="my-2 border-t" style={{ borderColor: "var(--border)" }} />

                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                            {total > 0
                              ? t("@legalos.timeTracking.hoursShort", { hours: total.toFixed(1) })
                              : "—"}
                          </span>
                          <Button
                            variant={isSelected ? "secondary" : "ghost"}
                            size="xs"
                            onClick={() => setSelectedDay(isSelected ? null : d.iso)}
                          >
                            {isSelected
                              ? t("@legalos.timeTracking.weekOverview.clear")
                              : t("@legalos.timeTracking.weekOverview.view")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* الصف السفلي: جدول القيود وملخص الساعات */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                      <CardTitle className="text-sm font-semibold">
                        {t("@legalos.timeTracking.entries.heading")}
                      </CardTitle>
                      <span className="text-xs" style={{ color: "var(--text2)" }}>
                        {selectedDay
                          ? t("@legalos.timeTracking.entries.showingDate", {
                              date: formatDate(selectedDay),
                            })
                          : view === "day"
                            ? t("@legalos.timeTracking.entries.showingToday", {
                                date: formatDate(today),
                              })
                            : t("@legalos.timeTracking.entries.showingFullWeek")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent style={{ padding: 0 }}>
                    {visibleEntries.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead style={{ minWidth: "110px" }}>
                              {t("@legalos.timeTracking.table.date")}
                            </TableHead>
                            <TableHead style={{ minWidth: "180px" }}>
                              {t("@legalos.timeTracking.table.matter")}
                            </TableHead>
                            <TableHead style={{ minWidth: "220px" }}>
                              {t("@legalos.timeTracking.table.description")}
                            </TableHead>
                            <TableHead style={{ minWidth: "130px" }}>
                              {t("@legalos.timeTracking.table.lawyer")}
                            </TableHead>
                            <TableHead style={{ minWidth: "130px" }}>
                              {t("@legalos.timeTracking.table.billable")}
                            </TableHead>
                            <TableHead style={{ minWidth: "90px", textAlign: "end" }}>
                              {t("@legalos.timeTracking.table.duration")}
                            </TableHead>
                            <TableHead style={{ width: "50px", textAlign: "end" }}>
                              <span className="sr-only">{t("@legalos.timeTracking.table.actions")}</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleEntries.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {item.date}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                                  {item.matter}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                                  {item.description || "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs" style={{ color: "var(--text2)" }}>
                                  {item.lawyer}
                                </span>
                              </TableCell>
                              <TableCell>
                                {item.billable ? (
                                  <Badge color="success" variant="soft" size="sm">
                                    {item.invoiced
                                      ? t("@legalos.timeTracking.badge.invoiced")
                                      : formatEGP(item.amount)}
                                  </Badge>
                                ) : (
                                  <Badge color="neutral" variant="soft" size="sm">
                                    {t("@legalos.timeTracking.badge.nonBillable")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell style={{ textAlign: "end" }}>
                                <span
                                  className="text-xs font-mono font-semibold"
                                  style={{ color: "var(--text)" }}
                                >
                                  {t("@legalos.timeTracking.hoursShort", { hours: item.hours.toFixed(1) })}
                                </span>
                              </TableCell>
                              <TableCell style={{ textAlign: "end" }}>
                                {!item.invoiced && (
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    loading={deletingId === item.id}
                                    disabled={deletingId === item.id}
                                    onClick={() => handleDeleteEntry(item.id)}
                                    style={{ color: "var(--danger)" }}
                                    aria-label={t("@legalos.timeTracking.deleteEntry")}
                                  >
                                    <Icon name="delete" size={16} />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-6">
                        <EmptyState
                          icon={<Icon name="schedule" size={24} />}
                          title={t("@legalos.timeTracking.entries.empty")}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ملخص الساعات واستغلال الفريق */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <CardTitle className="text-sm font-semibold">
                        {t("@legalos.timeTracking.summary.heading")}
                      </CardTitle>
                      <Link
                        href="/reports"
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {t("@legalos.timeTracking.summary.fullReport")}
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <p className="text-xs" style={{ color: "var(--text2)" }}>
                        {t("@legalos.timeTracking.summary.targetLabel", {
                          hours: WEEKLY_TARGET_HOURS,
                        })}
                      </p>

                      {perMember.length === 0 ? (
                        <p className="text-xs" style={{ color: "var(--text2)" }}>
                          {t("@legalos.timeTracking.summary.empty")}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {perMember.map((member) => {
                            const percentage = Math.min(
                              100,
                              Math.round((member.billable / WEEKLY_TARGET_HOURS) * 100),
                            );
                            return (
                              <div key={member.name} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Icon name="work" size={15} style={{ color: "var(--text2)" }} />
                                    <span className="font-semibold truncate" style={{ color: "var(--text)" }}>
                                      {member.name}
                                    </span>
                                  </div>
                                  <span className="text-xs shrink-0" style={{ color: "var(--text2)" }}>
                                    {t("@legalos.timeTracking.summary.billableHours", {
                                      hours: member.billable.toFixed(1),
                                    })}
                                    {member.nonBillable > 0
                                      ? ` · ${t("@legalos.timeTracking.summary.otherHours", {
                                          hours: member.nonBillable.toFixed(1),
                                        })}`
                                      : ""}
                                  </span>
                                </div>

                                <div
                                  role="progressbar"
                                  aria-valuenow={percentage}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={t("@legalos.timeTracking.summary.utilizationAriaLabel", {
                                    name: member.name,
                                  })}
                                  className="w-full h-2 rounded-full overflow-hidden"
                                  style={{
                                    backgroundColor: "var(--surface3)",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: "var(--primary)",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </DataView>

      {/* نافذة إنشاء قيد وقت جديد */}
      <TimeEntryDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        matters={matters}
        onSaved={resource.reload}
      />
    </div>
  );
}

/** Wall-clock timer that writes a real entry when stopped. */
function LiveTimer({
  matters,
  onLogged,
}: {
  matters: Matter[];
  onLogged: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [matterId, setMatterId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // استرجاع حالة المؤقت من localStorage دون استئناف العدّ تلقائياً
  // حماية لفواتير الموكلين من احتساب ساعات وهمية أثناء إغلاق التبويب (T-053)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!raw) return;
      const parsed: SavedTimerState = JSON.parse(raw);
      if (parsed.matterId) setMatterId(parsed.matterId);
      if (parsed.description) setDescription(parsed.description);
      setSeconds(parsed.baseSeconds ?? 0);
      setIsRunning(false);
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  }, []);

  // تشغيل العداد الحي
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // حفظ حالة المؤقت في localStorage عند تغير الحالة أو الحقول
  useEffect(() => {
    if (!isRunning && seconds === 0 && !matterId && !description) return;
    try {
      const state: SavedTimerState = {
        isRunning: false,
        matterId,
        description,
        baseSeconds: seconds,
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // تجاهل
    }
  }, [isRunning, matterId, description, seconds]);

  function startTimer() {
    setIsRunning(true);
  }

  async function stopAndLog() {
    setIsRunning(false);
    if (!practice || !matterId || seconds < 1) {
      setSeconds(0);
      try {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      } catch {}
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await practice.time.create({
        matter_id: Number(matterId),
        entry_date: todayIso(),
        // Billed to two decimals; anything under 36 seconds would round to
        // zero and the API rejects a zero-hour entry.
        hours: Math.max(0.01, Math.round((seconds / 3600) * 100) / 100),
        description,
      });
      setSeconds(0);
      setDescription("");
      try {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      } catch {}
      onLogged();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.timeTracking.timer.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 w-full">
          <CardTitle className="text-sm font-semibold">
            {t("@legalos.timeTracking.timer.heading")}
          </CardTitle>
          {isRunning && (
            <Badge
              variant="soft"
              color="success"
              icon={<Icon name="schedule" size={14} />}
            >
              {t("@legalos.timeTracking.timer.running")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <InlineError message={error} onDismiss={() => setError(null)} />

          <Select
            label={t("@legalos.timeTracking.timer.matterLabel")}
            value={matterId ?? ""}
            onChange={(e) => setMatterId(e.target.value || null)}
            options={[
              { value: "", label: t("@legalos.timeTracking.timer.matterPlaceholder") },
              ...matters.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />

          <Input
            label={t("@legalos.timeTracking.timer.descriptionLabel")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("@legalos.timeTracking.timer.descriptionPlaceholder")}
          />

          <div className="flex items-center justify-between gap-4 pt-2">
            <span
              className="text-3xl sm:text-4xl font-mono font-bold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              {formatDuration(seconds)}
            </span>
            <Button
              variant={isRunning ? "danger" : "primary"}
              startIcon={<Icon name={isRunning ? "stop" : "play_arrow"} size={18} />}
              loading={saving}
              disabled={saving || (!isRunning && !matterId)}
              onClick={() => (isRunning ? stopAndLog() : startTimer())}
            >
              {isRunning
                ? t("@legalos.timeTracking.timer.stopShort")
                : t("@legalos.timeTracking.timer.startShort")}
            </Button>
          </div>

          {!matterId && !isRunning && (
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.timeTracking.timer.pickMatterHint")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TimeEntryDialog({
  isOpen,
  onOpenChange,
  matters,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matters: Matter[];
  onSaved: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [matterId, setMatterId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState<ISODateString>(todayIso);
  const [hours, setHours] = useState(1);
  const [rate, setRate] = useState(0);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!practice || !matterId || hours <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await practice.time.create({
        matter_id: Number(matterId),
        entry_date: entryDate,
        hours,
        rate,
        description,
        billable,
      });
      setDescription("");
      setHours(1);
      onOpenChange(false);
      onSaved();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.timeTracking.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={520}>
      <DialogHeader
        title={t("@legalos.timeTracking.dialog.title")}
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
            <Select
              label={t("@legalos.timeTracking.dialog.matterLabel")}
              value={matterId ?? ""}
              onChange={(e) => setMatterId(e.target.value || null)}
              options={[
                { value: "", label: t("@legalos.timeTracking.dialog.matterPlaceholder") },
                ...matters.map((m) => ({ value: String(m.id), label: m.name })),
              ]}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                type="date"
                label={t("@legalos.timeTracking.dialog.dateLabel")}
                value={entryDate}
                onChange={(e) => setEntryDate((e.target.value || todayIso()) as ISODateString)}
                required
              />
              <Input
                type="number"
                label={t("@legalos.timeTracking.dialog.hoursLabel")}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 0)}
                min={0.25}
                max={24}
                step={0.25}
                required
              />
              <Input
                type="number"
                label={t("@legalos.timeTracking.dialog.rateLabel")}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 0)}
                min={0}
                step={50}
              />
            </div>
            <Input
              label={t("@legalos.timeTracking.dialog.descriptionLabel")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("@legalos.timeTracking.dialog.descriptionPlaceholder")}
            />
            <Checkbox
              label={t("@legalos.timeTracking.dialog.billableLabel")}
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
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
              {t("@legalos.timeTracking.dialog.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving || !matterId || hours <= 0}
            >
              {saving
                ? t("@legalos.timeTracking.dialog.saving")
                : t("@legalos.timeTracking.dialog.logTime")}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
