"use client";

/**
 * لوحة التحكم: مطابقة تامة للقالب (T-059).
 *
 * خمسة أقسام بالترتيب المحدد:
 * 1. الترويسة وشريط الأدوات (تحية، ملخص، مرشح العرض، تصدير معطل بتلميح "قريباً"، قضية جديدة)
 * 2. بطاقات المؤشرات الأربعة بألوان ثابتة ورسوم SVG sparkline تساعية النقاط وشارات الاتجاه
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
  const { formatDate, formatDateTime, formatEGP, formatEGPCompact } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice, organizationName } = useOrg();
  const memberName = useMemberName();

  // حالة شريط الأدوات والمرشحات
  const [scope, setScope] = useState<"all" | "my">("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // حالة المهام التفاعلية المتفائلة (Optimistic State)
  const [localTasks, setLocalTasks] = useState<MyTaskItem[]>([]);
  const [taskErrorMessage, setTaskErrorMessage] = useState<string | null>(null);

  // جلب بيانات لوحة التحكم والرؤى بالتوازي
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

  // مزامنة المهام المحلية عند تحميل أو تجديد البيانات
  useEffect(() => {
    if (resource.data?.insights?.my_tasks_today?.items) {
      setLocalTasks(resource.data.insights.my_tasks_today.items);
    }
  }, [resource.data?.insights?.my_tasks_today]);

  // تبديل حالة المهمة متفائلاً مع التراجع عند الفشل
  async function handleToggleTask(task: MyTaskItem) {
    if (!practice) return;
    const nextStatus = task.status === "done" ? "todo" : "done";
    const prevTasks = [...localTasks];

    // تحديث متفائل فوري للواجهة
    setLocalTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    setTaskErrorMessage(null);

    try {
      await practice.tasks.update(task.id, { status: nextStatus });
      // إعادة تحميل خفيفة في الخلفية لتحديث العدادات وسجل النشاط
      resource.reload();
    } catch (err) {
      // التراجع عند الفشل
      setLocalTasks(prevTasks);
      setTaskErrorMessage(
        err instanceof Error ? err.message : "تعذر تحديث حالة المهمة، يرجى المحاولة ثانية.",
      );
    }
  }

  // حساب عداد المهام المنجزة محلياً ليتفاعل فورياً
  const myTasksDoneCount = localTasks.filter((t) => t.status === "done").length;
  const myTasksTotalCount = localTasks.length;

  // تنسيق الشهر الحالي بالعربية لشريط الأدوات
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    const months = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  // دالة رسم خط الرسم البياني المصغر تساعي النقاط (Sparkline)
  function renderSparkline(values: number[], strokeColor: string) {
    const safeVals = values && values.length >= 9 ? values.slice(-9) : [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const min = Math.min(...safeVals);
    const max = Math.max(...safeVals);
    const range = max - min;

    const points = safeVals
      .map((val, i) => {
        const x = i * 15; // 0, 15, 30, 45, 60, 75, 90, 105, 120
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
      <DataView resource={resource} loadingLabel="جارٍ تحميل بيانات لوحة السجل...">
        {({ board, insights }) => {
          // حساب ملخص الجلسات والمذكرات العاجلة اليوم
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

          // حساب حركة القضايا للأعمدة البيانية
          const movementItems = insights.matters_movement ?? [];
          const maxMovement = Math.max(
            ...movementItems.map((m) => Math.max(m.opened, m.closed)),
            1,
          );

          // حساب ألوان وتدرج دونات توزيع القضايا
          const typeItems = insights.matters_by_type?.items ?? [];
          const totalActiveMatters = insights.matters_by_type?.total_active ?? board.active_matters;
          const palette = [
            "var(--primary)",
            "var(--accent)",
            "var(--info)",
            "var(--success)",
            "var(--warn)",
          ];
          let currentDeg = 0;
          const gradientSegments = typeItems.map((item, idx) => {
            const start = currentDeg;
            currentDeg += item.percentage;
            const color = palette[idx % palette.length];
            return `${color} ${start}% ${currentDeg}%`;
          });
          const donutConic =
            gradientSegments.length > 0
              ? `conic-gradient(${gradientSegments.join(", ")})`
              : "var(--surface3)";

          // حساب نسبة التحصيلات
          const totalBilledCollections = insights.collections.collected + insights.collections.outstanding;
          const collectedPercent =
            totalBilledCollections > 0
              ? Math.min(100, Math.round((insights.collections.collected / totalBilledCollections) * 100))
              : 0;
          const outstandingPercent =
            totalBilledCollections > 0
              ? Math.min(100, Math.round((insights.collections.outstanding / totalBilledCollections) * 100))
              : 0;

          // ترقيم جدول النشاط الأخير
          const recentTotal = insights.recent_matters?.total ?? 0;
          const recentStart = recentTotal === 0 ? 0 : (page - 1) * 5 + 1;
          const recentEnd = Math.min(page * 5, recentTotal);
          const totalPages = Math.max(1, Math.ceil(recentTotal / 5));

          return (
            <>
              {/* ============================================================== */}
              {/* ١ · الترويسة وشريط الأدوات                                     */}
              {/* ============================================================== */}
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      fontSize: "11.5px",
                      color: "var(--text3)",
                    }}
                  >
                    <span>الرئيسية</span>
                    <Icon name="chevron_left" size={15} />
                    <span style={{ color: "var(--text2)", fontWeight: 500 }}>لوحة السجل</span>
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "24px",
                      fontWeight: 600,
                      letterSpacing: "-0.4px",
                    }}
                  >
                    صباح الخير، {organizationName ?? "مكتب المحاماة"} 👋
                  </h1>
                  <div style={{ fontSize: "13px", color: "var(--text2)" }}>
                    {hearingsTodayCount > 0 || urgentDeadlinesCount > 0 ? (
                      <>
                        عندك{" "}
                        <strong style={{ color: "var(--warn)", fontWeight: 600 }}>
                          {hearingsTodayCount} جلسات
                        </strong>{" "}
                        اليوم و
                        <strong style={{ color: "var(--danger)", fontWeight: 600 }}>
                          {urgentDeadlinesCount} مذكرات
                        </strong>{" "}
                        على وشك انتهاء الميعاد.
                      </>
                    ) : (
                      <>
                        عندك{" "}
                        <strong style={{ color: "var(--primary)", fontWeight: 600 }}>
                          {board.upcoming?.length ?? 0} التزامات
                        </strong>{" "}
                        مجدولة خلال الـ 30 يومًا القادمة.
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  {/* مفتاح التبديل: على مستوى المكتب / ملفاتي */}
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
                      {scope === "all" ? "على مستوى المكتب" : "ملفاتي"}
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
                      aria-label="تبديل العرض بين على مستوى المكتب وملفاتي"
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

                  {/* التاريخ / الشهر الحالي */}
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

                  {/* زر التصدير (معطل بتلميح "قريبًا") */}
                  <Tooltip content="قريبًا">
                    <button
                      type="button"
                      disabled
                      style={{
                        height: "38px",
                        padding: "0 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--rs)",
                        background: "var(--surface2)",
                        color: "var(--text3)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "not-allowed",
                        boxShadow: "var(--shadow)",
                        opacity: 0.75,
                      }}
                      aria-label="تصدير (قريبًا)"
                    >
                      <Icon name="download" size={18} />
                      <span>تصدير</span>
                    </button>
                  </Tooltip>

                  {/* زر إنشاء قضية جديدة */}
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
                    <span>قضية جديدة</span>
                  </button>
                </div>
              </div>

              {/* ============================================================== */}
              {/* ٢ · بطاقات المؤشّرات الأربعة (ألوان وهوية ثابتة)                 */}
              {/* ============================================================== */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* بطاقة ١: قضايا نشطة */}
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
                        قضايا نشطة
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
                        borderRadius: "7px",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label="عرض القضايا"
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
                        color:
                          insights.kpi_deltas.active_matters.direction === "down"
                            ? "var(--danger)"
                            : "var(--success)",
                        background:
                          insights.kpi_deltas.active_matters.direction === "down"
                            ? "var(--danger-soft)"
                            : "var(--success-soft)",
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
                    {board.active_clients} موكّلًا نشطًا
                  </div>
                </div>

                {/* بطاقة ٢: المهام المفتوحة */}
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
                        المهام المفتوحة
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
                        borderRadius: "7px",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label="عرض المهام"
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
                        color:
                          insights.kpi_deltas.open_tasks.direction === "up"
                            ? "var(--danger)"
                            : "var(--warn)",
                        background:
                          insights.kpi_deltas.open_tasks.direction === "up"
                            ? "var(--danger-soft)"
                            : "var(--warn-soft)",
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
                    {board.overdue_tasks} متأخرة · {board.tasks_due_this_week} مستحقة هذا الأسبوع
                  </div>
                </div>

                {/* بطاقة ٣: الوقت غير المفوتَر */}
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
                        الوقت غير المفوتَر
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
                        borderRadius: "7px",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label="عرض تتبع الوقت"
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
                        {Number(board.unbilled_amount) > 0 ? "ج.م" : "ساعة"}
                      </span>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "var(--text2)",
                        background: "var(--surface3)",
                        padding: "3px 7px",
                        borderRadius: "999px",
                      }}
                    >
                      {insights.kpi_deltas.unbilled_hours.direction === "flat"
                        ? "ثابت"
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
                    من {Number(board.hours_this_month).toFixed(1)} ساعة مسجَّلة هذا الشهر
                  </div>
                </div>

                {/* بطاقة ٤: المستحقات */}
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
                        المستحقات
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
                        borderRadius: "7px",
                        background: "transparent",
                        color: "var(--text3)",
                      }}
                      aria-label="عرض الفوترة"
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
                        ج.م
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
                      <Icon name="arrow_upward" size={14} />
                      {insights.kpi_deltas.outstanding_amount.delta_pct}%
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
                    {formatEGPCompact(insights.collections.outstanding)} ج.م متأخرة السداد
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* ٣ · المخطّطان: حركة القضايا + توزيع القضايا                     */}
              {/* ============================================================== */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* حركة القضايا خلال الأشهر */}
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
                        حركة القضايا خلال الأشهر
                      </span>
                      <span style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                        المقيدة مقابل المنتهية · آخر 8 أشهر
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
                        مقيدة
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
                        منتهية
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
                                {m.label} · {m.opened} مقيدة · {m.closed} منتهية
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

                {/* توزيع القضايا حسب النوع */}
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
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>توزيع القضايا حسب النوع</span>
                    <span style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                      إجمالي {totalActiveMatters} قضية نشطة
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
                          <div style={{ fontSize: "10.5px", color: "var(--text3)" }}>قضية</div>
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
                          لا توجد قضايا نشطة مصنفة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* ٤ · النشاط الأخير (يمينًا) + القادم خلال ٣٠ يومًا (يسارًا)      */}
              {/* ============================================================== */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* النشاط الأخير (يمينًا في RTL) */}
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
                      <span style={{ fontSize: "14.5px", fontWeight: 600 }}>النشاط الأخير</span>
                      <span style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                        آخر تحديث قبل دقيقة
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
                        تصفية
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
                        كل القضايا
                      </Link>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", minWidth: "720px" }}>
                      <thead>
                        <tr style={{ background: "var(--surface2)" }}>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            رقم القضية
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            الموكّل
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            المحكمة
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            المحامي المسؤول
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            الجلسة القادمة
                          </th>
                          <th style={{ textAlign: "start", padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                            الحالة
                          </th>
                          <th style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }} />
                        </tr>
                      </thead>
                      <tbody>
                        {(insights.recent_matters?.items ?? []).map((matter) => {
                          const clientInitials = matter.client_name
                            ? matter.client_name.trim().slice(0, 2)
                            : "مو";
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
                                        ? `اليوم · ${matter.next_deadline.label}`
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
                                    ? "نشطة"
                                    : matter.status === "closed"
                                      ? "مغلقة"
                                      : "مؤجلة"}
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
                                  aria-label="تفاصيل القضية"
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
                                title="لا توجد قضايا"
                                description="لا توجد قضايا لعرضها في هذا النطاق حالياً"
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* تذييل ترقيم الصفحات */}
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
                      عرض {recentStart}–{recentEnd} من {recentTotal} قضية
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
                        aria-label="الصفحة السابقة"
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
                        aria-label="الصفحة التالية"
                      >
                        <Icon name="chevron_left" size={17} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* القادم خلال ٣٠ يومًا (يسارًا في RTL) */}
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
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>القادم خلال ٣٠ يومًا</span>
                    <Link href="/calendar" style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--primary)" }}>
                      التقويم
                    </Link>
                  </div>
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(board.upcoming ?? []).slice(0, 4).map((item, idx) => {
                      const isToday = item.due_date === todayIso();
                      const isRemote =
                        item.label.includes("عن بُعد") ||
                        item.label.includes("تحكيم") ||
                        item.label.includes("مرئي");

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
                              {isToday ? "اليوم" : "صباحًا"}
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
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                            <span style={{ fontSize: "12.5px", fontWeight: 600 }}>
                              {item.matter_name ? `${item.matter_name} — ` : ""}
                              {item.label}
                            </span>
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
                              {isRemote ? "جلسة عن بُعد · مركز القاهرة" : "المحكمة المختصة"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {(board.upcoming ?? []).length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text3)", fontSize: "12px" }}>
                        لا توجد التزامات مجدولة في الـ 30 يومًا القادمة
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* ٥ · مهامي اليوم · التحصيلات · سجل النشاط                       */}
              {/* ============================================================== */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                {/* مهامي اليوم (تفاعلية متفائلة) */}
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
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>مهامي اليوم</span>
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
                            {isDone ? "تم" : isDueToday ? "اليوم" : "غدًا"}
                          </span>
                        </label>
                      );
                    })}
                    {localTasks.length === 0 && (
                      <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)", fontSize: "12px" }}>
                        لا توجد مهام مسندة إليك لليوم
                      </div>
                    )}
                  </div>
                </div>

                {/* التحصيلات */}
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
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>التحصيلات</span>
                    <Link href="/billing" style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--primary)" }}>
                      الفوترة
                    </Link>
                  </div>
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "var(--text2)" }}>أتعاب محصّلة</span>
                        <strong style={{ fontWeight: 600 }}>
                          {formatEGPCompact(insights.collections.collected)} ج.م
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
                        <span style={{ color: "var(--text2)" }}>متأخرات</span>
                        <strong style={{ fontWeight: 600 }}>
                          {formatEGPCompact(insights.collections.outstanding)} ج.م
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
                          <>
                            أعلى نسبة تحصيل هذا الشهر لملفات{" "}
                            <strong style={{ color: "var(--text)" }}>
                              {enumLabel(insights.top_collection_rate.matter_type) ||
                                insights.top_collection_rate.matter_type}
                            </strong>{" "}
                            ({insights.top_collection_rate.rate}%).
                          </>
                        ) : (
                          "سجل الفواتير والتحصيلات لمتابعة أعلى نسب الأتعاب حسب التخصص."
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* سجل النشاط */}
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
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>سجل النشاط</span>
                  </div>
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                    {(board.recent_activity ?? []).slice(0, 4).map((act, index, arr) => {
                      const isLast = index === arr.length - 1;
                      // اختيار الأيقونة واللون حسب نوع الإجراء
                      let iconName = "check";
                      let iconColor = "var(--success)";
                      let iconBg = "var(--success-soft)";

                      if (act.action.includes("أُرفقت") || act.action.includes("مستند") || act.action.includes("ملف")) {
                        iconName = "upload_file";
                        iconColor = "var(--info)";
                        iconBg = "var(--info-soft)";
                      } else if (act.action.includes("تأجيل") || act.action.includes("جلسة") || act.action.includes("ميعاد")) {
                        iconName = "schedule";
                        iconColor = "var(--warn)";
                        iconBg = "var(--warn-soft)";
                      } else if (act.action.includes("تحصيل") || act.action.includes("فاتورة") || act.action.includes("أتعاب")) {
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
                        لا يوجد نشاط مسجل مؤخرًا
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* حوار إنشاء قضية جديدة المشترك */}
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
