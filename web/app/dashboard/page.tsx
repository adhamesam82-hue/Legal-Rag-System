"use client";

/**
 * لوحة التحكم: مطابقة تامة للقالب (T-059).
 *
 * خمسة أقسام بالترتيب المحدد:
 * 1. الترويسة وشريط الأدوات (تحية، ملخص، مرشح العرض، تصدير CSV مع BOM، قضية جديدة)
 * 2. بطاقات المؤشرات الأربعة بألوان وهوية ثابتة ورسوم SVG sparkline تساعية النقاط
 * 3. حركة القضايا خلال 8 أشهر + توزيع القضايا حسب النوع
 * 4. جدول النشاط الأخير (يمينًا) + القادم خلال 30 يومًا (يسارًا) بخصائص منطقية RTL
 * 5. مهامي اليوم (مربعات تفاعلية قابلة للنقر مع تحديث متفائل) + التحصيلات وسطر الرؤية المحسوب + سجل النشاط
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import { CreateMatterDialog } from "@/components/CreateMatterDialog";
import {
  daysUntil,
  todayIso,
  type MyTaskItem,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatterTypeIcon, ProximityBadge } from "@/components/Distinction";

export default function DashboardPage() {
  const { formatDate, formatDateTime, formatEGPCompact, formatMonth } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice, organizationName } = useOrg();
  const memberName = useMemberName();

  // Toolbar & filter state
  const [scope, setScope] = useState<"all" | "my">("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Optimistic tasks state
  const [localTasks, setLocalTasks] = useState<MyTaskItem[]>([]);
  const [taskErrorMessage, setTaskErrorMessage] = useState<string | null>(null);

  // Parallel data fetching
  const resource = useResource(
    async (api) => {
      const [board, insights] = await Promise.all([
        api.dashboard(30),
        api.dashboardInsights({ limit: 5, offset: (page - 1) * 5, scope }),
      ]);
      return { board, insights };
    },
    [page, scope],
  );

  // Sync tasks
  useEffect(() => {
    if (resource.data?.insights?.my_tasks_today?.items) {
      setLocalTasks(resource.data.insights.my_tasks_today.items);
    }
  }, [resource.data?.insights?.my_tasks_today]);

  // Optimistic task toggling
  async function handleToggleTask(task: MyTaskItem) {
    if (!practice) return;
    const nextStatus = task.status === "done" ? "todo" : "done";
    const prevTasks = [...localTasks];

    setLocalTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    setTaskErrorMessage(null);

    try {
      await practice.tasks.update(task.id, { status: nextStatus });
      resource.reload();
    } catch (err) {
      setLocalTasks(prevTasks);
      setTaskErrorMessage(
        err instanceof Error ? err.message : t("@legalos.dashboard.taskUpdateError"),
      );
    }
  }

  // Export CSV
  async function handleExportCsv() {
    if (!practice || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await practice.dashboardExportCsv(scope);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recent-matters-${todayIso()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Export failed
    } finally {
      setIsExporting(false);
    }
  }

  const myTasksDoneCount = localTasks.filter((t) => t.status === "done").length;
  const myTasksTotalCount = localTasks.length;

  const currentMonthLabel = useMemo(() => {
    return formatMonth(todayIso());
  }, [formatMonth]);

  function renderSparkline(values: number[], strokeColor: string) {
    const safeVals = values && values.length >= 9 ? values.slice(-9) : [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const min = Math.min(...safeVals);
    const max = Math.max(...safeVals);
    const range = max - min;

    const points = safeVals
      .map((val, i) => {
        const x = i * 15;
        const y = range === 0 ? 15 : 25 - ((val - min) / range) * 20;
        return `${x},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg
        viewBox="0 0 120 30"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "30px", overflow: "visible" }}
        aria-hidden="true"
      >
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <div className="flex flex-col gap-[18px] p-[22px] max-w-[1440px] mx-auto w-full text-[var(--text)]">
      <DataView resource={resource} loadingLabel={t("@legalos.dashboard.loading")}>
        {({ board, insights }) => {
          const todayStr = todayIso();
          const hearingsTodayCount = (board.upcoming ?? []).filter(
            (u) => u.kind === "hearing" && u.due_date === todayStr,
          ).length;
          const urgentDeadlinesCount = (board.upcoming ?? []).filter(
            (u) =>
              (u.kind === "deadline" || u.kind === "task") &&
              daysUntil(u.due_date) <= 2 &&
              daysUntil(u.due_date) >= 0,
          ).length;

          const movementItems = insights.matters_movement ?? [];
          const maxMovement = Math.max(
            ...movementItems.map((m) => Math.max(m.opened, m.closed)),
            1,
          );

          const typeItems = insights.matters_by_type?.items ?? [];
          const totalActiveMatters = insights.matters_by_type?.total_active ?? board.active_matters;
          const palette = [
            "var(--primary)",
            "var(--warn)",
            "var(--danger)",
            "var(--success)",
            "var(--accent)",
          ];
          let currentAngle = 0;
          const donutSegments = typeItems.map((item, idx) => {
            const pct = totalActiveMatters > 0 ? (item.count / totalActiveMatters) * 100 : 0;
            const start = currentAngle;
            const end = currentAngle + (pct * 360) / 100;
            currentAngle = end;
            return `${palette[idx % palette.length]} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
          });
          const donutConic =
            donutSegments.length > 0
              ? `conic-gradient(${donutSegments.join(", ")})`
              : "var(--surface3)";

          const totalBilledCollections =
            insights.collections.collected + insights.collections.outstanding;
          const collectedPercent =
            totalBilledCollections > 0
              ? Math.min(100, Math.round((insights.collections.collected / totalBilledCollections) * 100))
              : 0;
          const outstandingPercent =
            totalBilledCollections > 0
              ? Math.min(100, Math.round((insights.collections.outstanding / totalBilledCollections) * 100))
              : 0;

          const recentTotal = insights.recent_matters?.total ?? 0;
          const recentStart = recentTotal === 0 ? 0 : (page - 1) * 5 + 1;
          const recentEnd = Math.min(page * 5, recentTotal);
          const totalPages = Math.max(1, Math.ceil(recentTotal / 5));

          return (
            <>
              {/* 1 · Header and Toolbar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "24px",
                      fontWeight: 600,
                      letterSpacing: "-0.4px",
                    }}
                  >
                    {t("@legalos.dashboard.greeting", {
                      name: memberName || organizationName || t("@legalos.dashboard.orgFallback"),
                    })}
                  </h1>
                  <div style={{ fontSize: "13px", color: "var(--text2)" }}>
                    {hearingsTodayCount > 0 || urgentDeadlinesCount > 0 ? (
                      <>
                        {t("@legalos.dashboard.summary.prefix")}{" "}
                        <strong style={{ color: "var(--warn)", fontWeight: 600 }}>
                          {t("@legalos.dashboard.summary.hearingsCount", { count: hearingsTodayCount })}
                        </strong>{" "}
                        {t("@legalos.dashboard.summary.and")}{" "}
                        <strong style={{ color: "var(--danger)", fontWeight: 600 }}>
                          {t("@legalos.dashboard.summary.deadlinesCount", { count: urgentDeadlinesCount })}
                        </strong>{" "}
                        {t("@legalos.dashboard.summary.suffix")}
                      </>
                    ) : (
                      <>
                        {t("@legalos.dashboard.summary.prefix")}{" "}
                        <strong style={{ color: "var(--primary)", fontWeight: 600 }}>
                          {t("@legalos.dashboard.summary.commitmentsCount", { count: board.upcoming?.length ?? 0 })}
                        </strong>{" "}
                        {t("@legalos.dashboard.summary.scheduledNext30")}
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  {/* Scope Switcher */}
                  <div
                    style={{
                      height: "38px",
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      padding: "0 13px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--rs)",
                      background: "var(--surface)",
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text2)" }}>
                      {scope === "all" ? t("@legalos.dashboard.scope.firmWide") : t("@legalos.dashboard.scope.myFiles")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setScope((s) => (s === "all" ? "my" : "all"));
                        setPage(1);
                      }}
                      style={{
                        width: "40px",
                        height: "22px",
                        flex: "none",
                        border: 0,
                        borderRadius: "999px",
                        background: scope === "all" ? "var(--primary)" : "var(--surface3)",
                        position: "relative",
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                      }}
                      aria-label={t("@legalos.dashboard.scope.toggleAria")}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "3px",
                          insetInlineStart: scope === "all" ? "21px" : "3px",
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          background: "var(--surface)",
                          boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                          transition: "inset-inline-start 0.2s ease",
                        }}
                      />
                    </button>
                  </div>

                  {/* Current Month */}
                  <div
                    style={{
                      height: "38px",
                      padding: "0 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--rs)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "13px",
                      fontWeight: 600,
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <Icon name="calendar_month" size={18} />
                    <span>{currentMonthLabel}</span>
                  </div>

                  {/* CSV Export Button */}
                  <Tooltip content={t("@legalos.dashboard.exportCsv")}>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={isExporting}
                      style={{
                        height: "38px",
                        padding: "0 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--rs)",
                        background: "var(--surface)",
                        color: isExporting ? "var(--text3)" : "var(--text)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: isExporting ? "wait" : "pointer",
                        boxShadow: "var(--shadow)",
                      }}
                      aria-label={t("@legalos.dashboard.exportCsv")}
                    >
                      <Icon name="download" size={18} />
                      <span>{isExporting ? t("@legalos.dashboard.exporting") : t("@legalos.dashboard.exportCsv")}</span>
                    </button>
                  </Tooltip>

                  {/* New Matter Button */}
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    style={{
                      height: "38px",
                      padding: "0 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      border: 0,
                      borderRadius: "var(--rs)",
                      background: "var(--primary)",
                      color: "var(--primary-fg)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "var(--shadow)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <Icon name="add" size={18} />
                    <span>{t("@legalos.dashboard.newMatter")}</span>
                  </button>
                </div>
              </div>

              {/* 2 · Four KPI Cards (fixed identity colors) */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* Card 1: Active Matters */}
                <div
                  style={{
                    flex: "1 1 210px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    padding: "17px",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "13px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "11px",
                          background: "var(--primary-soft)",
                          color: "var(--primary)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon name="folder_open" size={21} />
                      </div>
                      <span style={{ fontSize: "12.5px", color: "var(--text2)", fontWeight: 500 }}>
                        {t("@legalos.dashboard.kpi.activeMatters")}
                      </span>
                    </div>
                    <Link
                      href="/matters"
                      style={{
                        width: "26px",
                        height: "26px",
                        display: "grid",
                        placeItems: "center",
                        border: 0,
                        borderRadius: "var(--rs)",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label={t("@legalos.dashboard.kpi.viewMatters")}
                    >
                      <Icon name="more_horiz" size={18} />
                    </Link>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "9px" }}>
                    <span style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-1px", lineHeight: 1 }}>
                      {board.active_matters}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "var(--primary)",
                        background: "var(--primary-soft)",
                        padding: "3px 7px",
                        borderRadius: "999px",
                      }}
                    >
                      <Icon
                        name={
                          insights.kpi_deltas.active_matters.direction === "down"
                            ? "arrow_downward"
                            : "arrow_upward"
                        }
                        size={14}
                      />
                      {insights.kpi_deltas.active_matters.delta_pct}%
                    </span>
                  </div>
                  {renderSparkline(insights.kpi_series.active_matters, "var(--primary)")}
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text3)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "9px",
                    }}
                  >
                    {t("@legalos.dashboard.kpi.activeClientsCount", { count: board.active_clients })}
                  </div>
                </div>

                {/* Card 2: Open Tasks */}
                <div
                  style={{
                    flex: "1 1 210px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    padding: "17px",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "13px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "11px",
                          background: "var(--warn-soft)",
                          color: "var(--warn)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon name="task_alt" size={21} />
                      </div>
                      <span style={{ fontSize: "12.5px", color: "var(--text2)", fontWeight: 500 }}>
                        {t("@legalos.dashboard.kpi.openTasks")}
                      </span>
                    </div>
                    <Link
                      href="/tasks"
                      style={{
                        width: "26px",
                        height: "26px",
                        display: "grid",
                        placeItems: "center",
                        border: 0,
                        borderRadius: "var(--rs)",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label={t("@legalos.dashboard.kpi.viewTasks")}
                    >
                      <Icon name="more_horiz" size={18} />
                    </Link>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "9px" }}>
                    <span style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-1px", lineHeight: 1 }}>
                      {board.open_tasks}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "var(--warn)",
                        background: "var(--warn-soft)",
                        padding: "3px 7px",
                        borderRadius: "999px",
                      }}
                    >
                      <Icon
                        name={
                          insights.kpi_deltas.open_tasks.direction === "down"
                            ? "arrow_downward"
                            : "arrow_upward"
                        }
                        size={14}
                      />
                      {insights.kpi_deltas.open_tasks.delta_pct}%
                    </span>
                  </div>
                  {renderSparkline(insights.kpi_series.open_tasks, "var(--warn)")}
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text3)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "9px",
                    }}
                  >
                    {t("@legalos.dashboard.kpi.tasksDetail", {
                      overdue: board.overdue_tasks,
                      dueThisWeek: board.tasks_due_this_week,
                    })}
                  </div>
                </div>

                {/* Card 3: Unbilled Time */}
                <div
                  style={{
                    flex: "1 1 210px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    padding: "17px",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "13px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "11px",
                          background: "var(--danger-soft)",
                          color: "var(--danger)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon name="timer" size={21} />
                      </div>
                      <span style={{ fontSize: "12.5px", color: "var(--text2)", fontWeight: 500 }}>
                        {t("@legalos.dashboard.kpi.unbilledTime")}
                      </span>
                    </div>
                    <Link
                      href="/time-tracking"
                      style={{
                        width: "26px",
                        height: "26px",
                        display: "grid",
                        placeItems: "center",
                        border: 0,
                        borderRadius: "var(--rs)",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label={t("@legalos.dashboard.kpi.viewTimeTracking")}
                    >
                      <Icon name="more_horiz" size={18} />
                    </Link>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "9px" }}>
                    <span style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-1px", lineHeight: 1 }}>
                      {Number(board.unbilled_amount) > 0
                        ? formatEGPCompact(board.unbilled_amount)
                        : Number(board.hours_this_month).toFixed(1)}
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text2)",
                          marginInlineStart: "4px",
                        }}
                      >
                        {Number(board.unbilled_amount) > 0
                          ? t("@legalos.dashboard.currencyEGP")
                          : t("@legalos.dashboard.hoursUnit")}
                      </span>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "var(--danger)",
                        background: "var(--danger-soft)",
                        padding: "3px 7px",
                        borderRadius: "999px",
                      }}
                    >
                      {insights.kpi_deltas.unbilled_hours.direction === "flat"
                        ? t("@legalos.dashboard.kpi.flat")
                        : `${insights.kpi_deltas.unbilled_hours.delta_pct}%`}
                    </span>
                  </div>
                  {renderSparkline(insights.kpi_series.unbilled_hours, "var(--danger)")}
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text3)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "9px",
                    }}
                  >
                    {t("@legalos.dashboard.kpi.hoursLoggedDetail", {
                      hours: Number(board.hours_this_month).toFixed(1),
                    })}
                  </div>
                </div>

                {/* Card 4: Outstanding */}
                <div
                  style={{
                    flex: "1 1 210px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    padding: "17px",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "13px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "11px",
                          background: "var(--success-soft)",
                          color: "var(--success)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon name="payments" size={21} />
                      </div>
                      <span style={{ fontSize: "12.5px", color: "var(--text2)", fontWeight: 500 }}>
                        {t("@legalos.dashboard.kpi.outstanding")}
                      </span>
                    </div>
                    <Link
                      href="/billing"
                      style={{
                        width: "26px",
                        height: "26px",
                        display: "grid",
                        placeItems: "center",
                        border: 0,
                        borderRadius: "var(--rs)",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label={t("@legalos.dashboard.kpi.viewBilling")}
                    >
                      <Icon name="more_horiz" size={18} />
                    </Link>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "9px" }}>
                    <span style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-1px", lineHeight: 1 }}>
                      {formatEGPCompact(board.outstanding_amount)}
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text2)",
                          marginInlineStart: "4px",
                        }}
                      >
                        {t("@legalos.dashboard.currencyEGP")}
                      </span>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "var(--success)",
                        background: "var(--success-soft)",
                        padding: "3px 7px",
                        borderRadius: "999px",
                      }}
                    >
                      {insights.kpi_deltas.outstanding_amount.direction === "flat"
                        ? t("@legalos.dashboard.kpi.flat")
                        : `${insights.kpi_deltas.outstanding_amount.delta_pct}%`}
                    </span>
                  </div>
                  {renderSparkline(insights.kpi_series.outstanding_amount, "var(--success)")}
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text3)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "9px",
                    }}
                  >
                    {t("@legalos.dashboard.kpi.outstandingDetail")}
                  </div>
                </div>
              </div>

              {/* 3 · Charts: Movement + Breakdown */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* Movement */}
                <div
                  style={{
                    flex: "2 1 480px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "17px 18px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                        {t("@legalos.dashboard.movement.title")}
                      </span>
                      <span style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                        {t("@legalos.dashboard.movement.subtitle")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11.5px",
                          color: "var(--text2)",
                        }}
                      >
                        <span
                          style={{
                            width: "9px",
                            height: "9px",
                            borderRadius: "3px",
                            background: "var(--primary)",
                          }}
                        />
                        {t("@legalos.dashboard.movement.opened")}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11.5px",
                          color: "var(--text2)",
                        }}
                      >
                        <span
                          style={{
                            width: "9px",
                            height: "9px",
                            borderRadius: "3px",
                            background: "var(--accent)",
                          }}
                        />
                        {t("@legalos.dashboard.movement.closed")}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: "20px 18px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "14px",
                        height: "190px",
                        paddingBottom: "2px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {movementItems.map((m, idx) => {
                        const openedHeightPct = Math.max(6, Math.round((m.opened / maxMovement) * 100));
                        const closedHeightPct = Math.max(6, Math.round((m.closed / maxMovement) * 100));
                        const isHovered = hoveredBarIndex === idx;

                        return (
                          <div
                            key={m.month}
                            onMouseEnter={() => setHoveredBarIndex(idx)}
                            onMouseLeave={() => setHoveredBarIndex(null)}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "flex-end",
                              justifyContent: "center",
                              gap: "5px",
                              height: "100%",
                              position: "relative",
                              cursor: "pointer",
                            }}
                          >
                            {isHovered && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: "100%",
                                  insetInlineStart: "50%",
                                  transform: "translateX(50%) translateY(-8px)",
                                  background: "var(--text)",
                                  color: "var(--surface)",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "6px 9px",
                                  borderRadius: "8px",
                                  whiteSpace: "nowrap",
                                  boxShadow: "var(--shadow-lg)",
                                  zIndex: 10,
                                }}
                              >
                                {t("@legalos.dashboard.movement.tooltip", {
                                  label: m.label,
                                  opened: m.opened,
                                  closed: m.closed,
                                })}
                              </div>
                            )}
                            <div
                              style={{
                                width: "14px",
                                height: `${openedHeightPct}%`,
                                background: "var(--primary)",
                                borderRadius: "5px 5px 0 0",
                                boxShadow: isHovered ? "0 0 0 3px var(--primary-soft)" : "none",
                                transition: "all 0.15s ease",
                              }}
                            />
                            <div
                              style={{
                                width: "14px",
                                height: `${closedHeightPct}%`,
                                background: "var(--accent)",
                                borderRadius: "5px 5px 0 0",
                                transition: "all 0.15s ease",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--text3)" }}>
                      {movementItems.map((m) => (
                        <span key={m.month} style={{ flex: 1, textAlign: "center" }}>
                          {m.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Breakdown by Type */}
                <div
                  style={{
                    flex: "1 1 300px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "17px 18px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                      {t("@legalos.dashboard.byType.title")}
                    </span>
                    <span style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                      {t("@legalos.dashboard.byType.totalActive", { count: totalActiveMatters })}
                    </span>
                  </div>
                  <div style={{ padding: "18px", display: "flex", alignItems: "center", gap: "20px" }}>
                    <div
                      style={{
                        width: "132px",
                        height: "132px",
                        flex: "none",
                        borderRadius: "50%",
                        background: donutConic,
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: "88px",
                          height: "88px",
                          borderRadius: "50%",
                          background: "var(--surface)",
                          display: "grid",
                          placeItems: "center",
                          textAlign: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.1 }}>
                            {totalActiveMatters}
                          </div>
                          <div style={{ fontSize: "10.5px", color: "var(--text3)" }}>
                            {t("@legalos.dashboard.byType.mattersUnit")}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "9px" }}>
                      {typeItems.slice(0, 5).map((item, idx) => (
                        <div
                          key={item.matter_type}
                          style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}
                        >
                          <span
                            style={{
                              width: "9px",
                              height: "9px",
                              borderRadius: "3px",
                              background: palette[idx % palette.length],
                              flex: "none",
                            }}
                          />
                          <span style={{ flex: 1, color: "var(--text2)" }}>
                            {enumLabel(item.matter_type) || item.matter_type}
                          </span>
                          <strong style={{ fontWeight: 600 }}>{item.count}</strong>
                        </div>
                      ))}
                      {typeItems.length === 0 && (
                        <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                          {t("@legalos.dashboard.byType.empty")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 · Recent Activity + Next 30 Days */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* Recent Activity Table */}
                <div
                  style={{
                    flex: "2 1 480px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "15px 18px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                        {t("@legalos.dashboard.recentMatters.title")}
                      </span>
                      <span style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                        {t("@legalos.dashboard.recentMatters.lastUpdated")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Link
                        href="/matters"
                        style={{
                          height: "32px",
                          padding: "0 11px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          border: "1px solid var(--border)",
                          borderRadius: "9px",
                          background: "var(--surface)",
                          color: "var(--text2)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <Icon name="filter_list" size={16} />
                        {t("@legalos.dashboard.recentMatters.filter")}
                      </Link>
                      <Link
                        href="/matters"
                        style={{
                          height: "32px",
                          padding: "0 11px",
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid var(--border)",
                          borderRadius: "9px",
                          background: "var(--surface)",
                          color: "var(--text2)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {t("@legalos.dashboard.recentMatters.allMatters")}
                      </Link>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", minWidth: "720px" }}>
                      <thead>
                        <tr style={{ background: "var(--surface2)" }}>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            {t("@legalos.dashboard.recentMatters.colMatterNumber")}
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            {t("@legalos.dashboard.recentMatters.colClient")}
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            {t("@legalos.dashboard.recentMatters.colCourt")}
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            {t("@legalos.dashboard.recentMatters.colLawyer")}
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            {t("@legalos.dashboard.recentMatters.colNextDeadline")}
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            {t("@legalos.dashboard.recentMatters.colStatus")}
                          </th>
                          <th style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }} />
                        </tr>
                      </thead>
                      <tbody>
                        {(insights.recent_matters?.items ?? []).map((matter) => {
                          const clientInitials = matter.client_name
                            ? matter.client_name.trim().slice(0, 2)
                            : "—";
                          const isTodayDeadline =
                            matter.next_deadline?.due_date === todayIso();

                          return (
                            <tr
                              key={matter.id}
                              style={{ borderBottom: "1px solid var(--border)" }}
                              className="hover:bg-[var(--surface2)] transition-colors"
                            >
                              <td style={{ padding: "12px 16px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                <Link href={`/matters/${matter.id}`} className="hover:underline">
                                  {matter.matter_number}
                                </Link>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                                  <div
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      background: "var(--primary-soft)",
                                      color: "var(--primary)",
                                      display: "grid",
                                      placeItems: "center",
                                      fontSize: "10.5px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {clientInitials}
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 500 }}>{matter.client_name || matter.name}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <MatterTypeIcon type={matter.matter_type} />
                                      <span style={{ fontSize: "10.5px", color: "var(--text3)" }}>
                                        {enumLabel(matter.matter_type) || matter.matter_type}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px", color: "var(--text2)" }}>
                                {matter.court}
                              </td>
                              <td style={{ padding: "12px 16px", color: "var(--text2)" }}>
                                {memberName(matter.responsible_user)}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  color: isTodayDeadline ? "var(--danger)" : "var(--text2)",
                                  fontWeight: isTodayDeadline ? 600 : 400,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span>
                                    {matter.next_deadline
                                      ? isTodayDeadline
                                        ? t("@legalos.dashboard.recentMatters.todayPrefix", {
                                            label: matter.next_deadline.label,
                                          })
                                        : `${formatDate(matter.next_deadline.due_date)}`
                                      : "—"}
                                  </span>
                                  {matter.next_deadline && (
                                    <ProximityBadge date={matter.next_deadline.due_date} />
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color:
                                      matter.status === "active"
                                        ? "var(--success)"
                                        : matter.status === "closed"
                                          ? "var(--text2)"
                                          : "var(--warn)",
                                    background:
                                      matter.status === "active"
                                        ? "var(--success-soft)"
                                        : matter.status === "closed"
                                          ? "var(--surface3)"
                                          : "var(--warn-soft)",
                                    padding: "4px 9px",
                                    borderRadius: "999px",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      background: "currentColor",
                                    }}
                                  />
                                  {matter.status === "active"
                                    ? t("@legalos.dashboard.status.active")
                                    : matter.status === "closed"
                                      ? t("@legalos.dashboard.status.closed")
                                      : t("@legalos.dashboard.status.pending")}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "end" }}>
                                <Link
                                  href={`/matters/${matter.id}`}
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    display: "grid",
                                    placeItems: "center",
                                    borderRadius: "var(--rs)",
                                    color: "var(--text3)",
                                  }}
                                  aria-label={t("@legalos.dashboard.recentMatters.matterDetails")}
                                >
                                  <Icon name="more_horiz" size={18} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                        {(insights.recent_matters?.items ?? []).length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center", padding: "28px" }}>
                              <EmptyState
                                icon="folder_open"
                                title={t("@legalos.dashboard.recentMatters.emptyTitle")}
                                description={t("@legalos.dashboard.recentMatters.emptyDescription")}
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Footer */}
                  <div
                    style={{
                      padding: "12px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                      {t("@legalos.dashboard.recentMatters.pagination", {
                        start: recentStart,
                        end: recentEnd,
                        total: recentTotal,
                      })}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        style={{
                          width: "30px",
                          height: "30px",
                          display: "grid",
                          placeItems: "center",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          background: "var(--surface)",
                          color: page <= 1 ? "var(--text3)" : "var(--text)",
                          cursor: page <= 1 ? "not-allowed" : "pointer",
                          opacity: page <= 1 ? 0.5 : 1,
                        }}
                        aria-label={t("@legalos.dashboard.recentMatters.prevPage")}
                      >
                        <Icon name="chevron_right" size={17} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setPage(pNum)}
                          style={{
                            width: "30px",
                            height: "30px",
                            border: pNum === page ? 0 : "1px solid var(--border)",
                            borderRadius: "8px",
                            background: pNum === page ? "var(--primary)" : "var(--surface)",
                            color: pNum === page ? "var(--primary-fg)" : "var(--text2)",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {pNum}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        style={{
                          width: "30px",
                          height: "30px",
                          display: "grid",
                          placeItems: "center",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          background: "var(--surface)",
                          color: page >= totalPages ? "var(--text3)" : "var(--text)",
                          cursor: page >= totalPages ? "not-allowed" : "pointer",
                          opacity: page >= totalPages ? 0.5 : 1,
                        }}
                        aria-label={t("@legalos.dashboard.recentMatters.nextPage")}
                      >
                        <Icon name="chevron_left" size={17} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Next 30 Days */}
                <div
                  style={{
                    flex: "1 1 300px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "15px 18px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                      {t("@legalos.dashboard.next30.heading")}
                    </span>
                    <Link href="/calendar" style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--primary)" }}>
                      {t("@legalos.dashboard.next30.calendarLink")}
                    </Link>
                  </div>
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(board.upcoming ?? []).slice(0, 4).map((item, idx) => {
                      const isToday = item.due_date === todayIso();
                      const isRemote = new RegExp(t("@legalos.dashboard.patterns.remote"), "i").test(item.label);

                      return (
                        <div
                          key={`${item.kind}-${item.label}-${idx}`}
                          style={{
                            display: "flex",
                            gap: "12px",
                            padding: "11px",
                            borderRadius: "var(--rs)",
                            background: isToday ? "var(--danger-soft)" : "transparent",
                            border: isToday
                              ? "1px solid color-mix(in oklab, var(--danger) 22%, transparent)"
                              : "1px solid var(--border)",
                          }}
                        >
                          <div
                            style={{
                              width: "44px",
                              flex: "none",
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              color: isToday ? "var(--danger)" : "var(--text2)",
                            }}
                          >
                            <span style={{ fontSize: "19px", fontWeight: 700, lineHeight: 1 }}>
                              {item.due_date ? item.due_date.slice(8, 10) : "11"}
                            </span>
                            <span style={{ fontSize: "10px", fontWeight: 600 }}>
                              {isToday ? t("@legalos.dashboard.upcoming.today") : t("@legalos.dashboard.upcoming.morning")}
                            </span>
                          </div>
                          <div
                            style={{
                              width: "1px",
                              background: isToday
                                ? "color-mix(in oklab, var(--danger) 25%, transparent)"
                                : "var(--border)",
                            }}
                          />
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                              <span style={{ fontSize: "12.5px", fontWeight: 600 }}>
                                {item.matter_name ? `${item.matter_name} — ` : ""}
                                {item.label}
                              </span>
                              <ProximityBadge date={item.due_date} />
                            </div>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text2)",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Icon name={isRemote ? "videocam" : "place"} size={14} />
                              {isRemote
                                ? t("@legalos.dashboard.upcoming.remoteLocation")
                                : t("@legalos.dashboard.upcoming.defaultCourt")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {(board.upcoming ?? []).length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text3)", fontSize: "12px" }}>
                        {t("@legalos.dashboard.next30.empty.title")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 5 · My Tasks Today + Collections + Activity Feed */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* My Tasks Today */}
                <div
                  style={{
                    flex: "1 1 300px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "15px 18px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                      {t("@legalos.dashboard.myTasks.title")}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text3)" }}>
                      {myTasksDoneCount} / {myTasksTotalCount}
                    </span>
                  </div>
                  {taskErrorMessage && (
                    <div
                      style={{
                        margin: "8px 12px 0",
                        padding: "6px 10px",
                        fontSize: "11px",
                        borderRadius: "var(--rs)",
                        background: "var(--danger-soft)",
                        color: "var(--danger)",
                      }}
                    >
                      {taskErrorMessage}
                    </div>
                  )}
                  <div style={{ padding: "6px 12px 12px", display: "flex", flexDirection: "column" }}>
                    {localTasks.map((task) => {
                      const isDone = task.status === "done";
                      const isDueToday = task.due_date === todayIso();

                      return (
                        <label
                          key={task.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "11px",
                            padding: "11px 6px",
                            borderBottom: "1px solid var(--border)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleTask(task)}
                            style={{
                              width: "17px",
                              height: "17px",
                              accentColor: "var(--primary)",
                              cursor: "pointer",
                              flex: "none",
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: "12.5px",
                              color: isDone ? "var(--text3)" : "var(--text)",
                              textDecoration: isDone ? "line-through" : "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {task.title}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              color: isDone
                                ? "var(--text3)"
                                : isDueToday
                                  ? "var(--danger)"
                                  : "var(--warn)",
                              background: isDone
                                ? "var(--surface3)"
                                : isDueToday
                                  ? "var(--danger-soft)"
                                  : "var(--warn-soft)",
                              padding: "3px 7px",
                              borderRadius: "999px",
                            }}
                          >
                            {isDone
                              ? t("@legalos.dashboard.myTasks.done")
                              : isDueToday
                                ? t("@legalos.dashboard.myTasks.today")
                                : t("@legalos.dashboard.myTasks.tomorrow")}
                          </span>
                        </label>
                      );
                    })}
                    {localTasks.length === 0 && (
                      <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)", fontSize: "12px" }}>
                        {t("@legalos.dashboard.myTasks.empty")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Collections */}
                <div
                  style={{
                    flex: "1 1 300px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "15px 18px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                      {t("@legalos.dashboard.collections.heading")}
                    </span>
                    <Link href="/billing" style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--primary)" }}>
                      {t("@legalos.dashboard.collections.billingLink")}
                    </Link>
                  </div>
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "var(--text2)" }}>
                          {t("@legalos.dashboard.collections.collectedFees")}
                        </span>
                        <strong style={{ fontWeight: 600 }}>
                          {formatEGPCompact(insights.collections.collected)} {t("@legalos.dashboard.currencyEGP")}
                        </strong>
                      </div>
                      <div style={{ height: "7px", borderRadius: "99px", background: "var(--surface3)", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${collectedPercent}%`,
                            height: "100%",
                            background: "var(--success)",
                            borderRadius: "99px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "var(--text2)" }}>
                          {t("@legalos.dashboard.collections.overdue")}
                        </span>
                        <strong style={{ fontWeight: 600 }}>
                          {formatEGPCompact(insights.collections.outstanding)} {t("@legalos.dashboard.currencyEGP")}
                        </strong>
                      </div>
                      <div style={{ height: "7px", borderRadius: "99px", background: "var(--surface3)", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${outstandingPercent}%`,
                            height: "100%",
                            background: "var(--warn)",
                            borderRadius: "99px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "9px",
                        padding: "11px",
                        borderRadius: "var(--rs)",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Icon name="lightbulb" size={18} className="text-[var(--info)] flex-none" />
                      <span style={{ fontSize: "11.5px", color: "var(--text2)", lineHeight: 1.6 }}>
                        {insights.top_collection_rate?.matter_type ? (
                          t("@legalos.dashboard.collections.insightTopRate", {
                            type:
                              enumLabel(insights.top_collection_rate.matter_type) ||
                              insights.top_collection_rate.matter_type,
                            rate: insights.top_collection_rate.rate,
                          })
                        ) : (
                          t("@legalos.dashboard.collections.insightEmpty")
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Activity Feed */}
                <div
                  style={{
                    flex: "1 1 300px",
                    minWidth: "0",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ padding: "15px 18px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>
                      {t("@legalos.dashboard.activity.title")}
                    </span>
                  </div>
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                    {(board.recent_activity ?? []).slice(0, 4).map((act, index, arr) => {
                      const isLast = index === arr.length - 1;
                      let iconName = "check";
                      let iconColor = "var(--success)";
                      let iconBg = "var(--success-soft)";

                      const actLower = act.action.toLowerCase();
                      if (new RegExp(t("@legalos.dashboard.patterns.upload"), "i").test(actLower)) {
                        iconName = "upload_file";
                        iconColor = "var(--info)";
                        iconBg = "var(--info-soft)";
                      } else if (new RegExp(t("@legalos.dashboard.patterns.schedule"), "i").test(actLower)) {
                        iconName = "schedule";
                        iconColor = "var(--warn)";
                        iconBg = "var(--warn-soft)";
                      } else if (new RegExp(t("@legalos.dashboard.patterns.payment"), "i").test(actLower)) {
                        iconName = "payments";
                        iconColor = "var(--accent)";
                        iconBg = "var(--accent-soft)";
                      }

                      return (
                        <div
                          key={act.id}
                          style={{
                            display: "flex",
                            gap: "12px",
                            position: "relative",
                            paddingBottom: isLast ? 0 : "16px",
                          }}
                        >
                          {!isLast && (
                            <div
                              style={{
                                position: "absolute",
                                insetInlineStart: "11px",
                                top: "24px",
                                bottom: 0,
                                width: "1.5px",
                                background: "var(--border)",
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              flex: "none",
                              borderRadius: "50%",
                              background: iconBg,
                              color: iconColor,
                              display: "grid",
                              placeItems: "center",
                              zIndex: 1,
                            }}
                          >
                            <Icon name={iconName} size={15} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "12.5px" }}>{act.action}</span>
                            <span style={{ fontSize: "10.5px", color: "var(--text3)" }}>
                              {act.actor} · {formatDateTime(act.occurred_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {(board.recent_activity ?? []).length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text3)", fontSize: "12px" }}>
                        {t("@legalos.dashboard.activity.empty")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Create Matter Dialog */}
              <CreateMatterDialog
                isOpen={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onCreated={() => {
                  resource.reload();
                }}
              />
            </>
          );
        }}
      </DataView>
    </div>
  );
}
