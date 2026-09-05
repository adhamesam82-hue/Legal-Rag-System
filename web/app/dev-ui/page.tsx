"use client";

import React from "react";
import { notFound } from "next/navigation";
import {
  Button,
  Input,
  Textarea,
  Select,
  MultiSelect,
  Switch,
  Checkbox,
  Radio,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Alert,
  Toolbar,
  SearchInput,
  ButtonGroup,
  FilterBar,
  EmptyState,
  Skeleton,
  Icon,
} from "@/components/ui";

/**
 * صفحة معاينة مكتبة المكونات الداخلية (Component Matrix / Dev UI)
 * مخصصة لبيئة التطوير والمراجعة الداخلية فقط ومحجوبة عن الإنتاج.
 */
export default function DevUiPage() {
  // حجب الصفحة عن الإنتاج: إذا كان NODE_ENV === 'production' يتم إرجاع 404
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  // حالات التحكم الحية
  const [shellTheme, setShellTheme] = React.useState<"light" | "dark">("light");
  const [navTheme, setNavTheme] = React.useState<"light" | "dark">("light");
  const [themeMode, setThemeMode] = React.useState<"light" | "dark" | "mixed" | "mixed-inv">("mixed");
  const [radius, setRadius] = React.useState<number>(14);
  const [density, setDensity] = React.useState<"comfortable" | "medium" | "compact">("medium");
  const [dir, setDir] = React.useState<"rtl" | "ltr">("rtl");
  const [activeTab, setActiveTab] = React.useState<"buttons" | "forms" | "data" | "feedback">("buttons");

  // تطبيق الأوضاع الأربعة
  const applyThemeMode = (mode: "light" | "dark" | "mixed" | "mixed-inv") => {
    setThemeMode(mode);
    if (mode === "light") {
      setShellTheme("light");
      setNavTheme("light");
    } else if (mode === "dark") {
      setShellTheme("dark");
      setNavTheme("dark");
    } else if (mode === "mixed") {
      setShellTheme("light");
      setNavTheme("dark");
    } else if (mode === "mixed-inv") {
      setShellTheme("dark");
      setNavTheme("light");
    }
  };

  const rowPads = {
    comfortable: "18px",
    medium: "14px",
    compact: "10px",
  };

  // حالات تفاعلية محلية للاختبار
  const [switchState, setSwitchState] = React.useState(true);
  const [selectedRows, setSelectedRows] = React.useState<string[]>(["2026/4187", "2026/4210"]);
  const [filterValues, setFilterValues] = React.useState<Record<string, string[]>>({
    status: ["active"],
    court: ["commercial"],
  });
  const [tags, setTags] = React.useState([
    { value: "civil", label: "مدني", color: "primary" as const },
    { value: "commercial", label: "تجاري", color: "accent" as const },
    { value: "arbitration", label: "تحكيم", color: "info" as const },
  ]);

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div
      dir={dir}
      data-theme={shellTheme}
      style={
        {
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--text)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          "--r": `${radius}px`,
          "--rs": `${Math.max(4, radius - 4)}px`,
          "--rowpad": rowPads[density],
        } as React.CSSProperties
      }
    >
      {/* شريط التحكم الحي بالثيمات والهندسة */}
      <Card padding="14px 18px" shadow bordered>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--primary)",
                color: "var(--primary-fg)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="widgets" size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                مصفوفة مكونات السِّجل — بيئة المعاينة الداخلية
              </h1>
              <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text3)" }}>
                عرض الحالات والأنماط الستة واختبار المرونة عبر الرموز والأوضاع الأربعة
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            {/* مبدل الأوضاع الأربعة */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "3px",
              }}
            >
              <button
                type="button"
                onClick={() => applyThemeMode("light")}
                title="فاتح"
                style={{
                  height: "28px",
                  padding: "0 10px",
                  border: 0,
                  borderRadius: "999px",
                  background: themeMode === "light" ? "var(--surface)" : "transparent",
                  color: themeMode === "light" ? "var(--text)" : "var(--text3)",
                  boxShadow: themeMode === "light" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="light_mode" size={16} />
                فاتح
              </button>

              <button
                type="button"
                onClick={() => applyThemeMode("dark")}
                title="داكن"
                style={{
                  height: "28px",
                  padding: "0 10px",
                  border: 0,
                  borderRadius: "999px",
                  background: themeMode === "dark" ? "var(--surface)" : "transparent",
                  color: themeMode === "dark" ? "var(--text)" : "var(--text3)",
                  boxShadow: themeMode === "dark" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="dark_mode" size={16} />
                داكن
              </button>

              <button
                type="button"
                onClick={() => applyThemeMode("mixed")}
                title="مختلط (قائمة داكنة وجذر فاتح)"
                style={{
                  height: "28px",
                  padding: "0 10px",
                  border: 0,
                  borderRadius: "999px",
                  background: themeMode === "mixed" ? "var(--surface)" : "transparent",
                  color: themeMode === "mixed" ? "var(--text)" : "var(--text3)",
                  boxShadow: themeMode === "mixed" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="contrast" size={16} />
                مختلط
              </button>

              <button
                type="button"
                onClick={() => applyThemeMode("mixed-inv")}
                title="مختلط عكسي (قائمة فاتحة وجذر داكن)"
                style={{
                  height: "28px",
                  padding: "0 10px",
                  border: 0,
                  borderRadius: "999px",
                  background: themeMode === "mixed-inv" ? "var(--surface)" : "transparent",
                  color: themeMode === "mixed-inv" ? "var(--text)" : "var(--text3)",
                  boxShadow: themeMode === "mixed-inv" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="invert_colors" size={16} />
                عكسي
              </button>
            </div>

            {/* منزلق الحواف --r */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
              <span style={{ color: "var(--text2)", fontWeight: 600 }}>الحواف (--r):</span>
              <input
                type="range"
                min="4"
                max="22"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ width: "80px", accentColor: "var(--primary)", cursor: "pointer" }}
              />
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, width: "32px" }}>
                {radius}px
              </span>
            </div>

            {/* مبدل الكثافة --rowpad */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
              <span style={{ color: "var(--text2)", fontWeight: 600 }}>الكثافة:</span>
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as "comfortable" | "medium" | "compact")}
                style={{
                  height: "30px",
                  padding: "0 8px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--rs)",
                  background: "var(--surface2)",
                  color: "var(--text)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <option value="comfortable">مريح (18px)</option>
                <option value="medium">متوسط (14px)</option>
                <option value="compact">مضغوط (10px)</option>
              </select>
            </div>

            {/* مبدل الاتجاه */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDir(dir === "rtl" ? "ltr" : "rtl")}
              startIcon={<Icon name="translate" size={16} />}
            >
              {dir.toUpperCase()}
            </Button>
          </div>
        </div>
      </Card>

      {/* تبويبات الأقسام الأربعة للمكتبة */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "999px",
          padding: "4px",
          width: "fit-content",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("buttons")}
          style={{
            height: "32px",
            padding: "0 16px",
            border: 0,
            borderRadius: "999px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "buttons" ? "var(--surface)" : "transparent",
            color: activeTab === "buttons" ? "var(--text)" : "var(--text3)",
            boxShadow: activeTab === "buttons" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
          }}
        >
          الأزرار
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("forms")}
          style={{
            height: "32px",
            padding: "0 16px",
            border: 0,
            borderRadius: "999px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "forms" ? "var(--surface)" : "transparent",
            color: activeTab === "forms" ? "var(--text)" : "var(--text3)",
            boxShadow: activeTab === "forms" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
          }}
        >
          الحقول والتحكم
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("data")}
          style={{
            height: "32px",
            padding: "0 16px",
            border: 0,
            borderRadius: "999px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "data" ? "var(--surface)" : "transparent",
            color: activeTab === "data" ? "var(--text)" : "var(--text3)",
            boxShadow: activeTab === "data" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
          }}
        >
          البيانات والشارات
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("feedback")}
          style={{
            height: "32px",
            padding: "0 16px",
            border: 0,
            borderRadius: "999px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "feedback" ? "var(--surface)" : "transparent",
            color: activeTab === "feedback" ? "var(--text)" : "var(--text3)",
            boxShadow: activeTab === "feedback" ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
          }}
        >
          التنبيهات والمودال
        </button>
      </div>

      {/* التبويب 1: الأزرار */}
      {activeTab === "buttons" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* مصفوفة الأزرار الـ 8 × الـ 6 حالات */}
          <Card bordered shadow>
            <CardHeader bordered>
              <div>
                <CardTitle>مصفوفة الأزرار الـ 8 أنماط × الـ 6 حالات</CardTitle>
                <CardDescription>
                  كل عمود يمثل حالة مرسومة بوضوح: Default · Hover · Focus · Active · Disabled · Loading (مع الدوامة والنص).
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ overflowX: "auto" }}>
                <div
                  style={{
                    minWidth: "960px",
                    display: "grid",
                    gridTemplateColumns: "110px repeat(6, minmax(0, 1fr))",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  {/* رأس الأعمدة */}
                  <span />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", textAlign: "center" }}>
                    Default
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", textAlign: "center" }}>
                    Hover
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", textAlign: "center" }}>
                    Focus
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", textAlign: "center" }}>
                    Active
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", textAlign: "center" }}>
                    Disabled
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", textAlign: "center" }}>
                    Loading
                  </span>

                  {/* 1. Primary */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Primary (حفظ)</span>
                  <Button variant="primary" fullWidth>حفظ</Button>
                  <Button variant="primary" forceState="hover" fullWidth>حفظ</Button>
                  <Button variant="primary" forceState="focus" fullWidth>حفظ</Button>
                  <Button variant="primary" forceState="active" fullWidth>حفظ</Button>
                  <Button variant="primary" forceState="disabled" fullWidth>حفظ</Button>
                  <Button variant="primary" forceState="loading" fullWidth>حفظ</Button>

                  {/* 2. Secondary */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Secondary (إلغاء)</span>
                  <Button variant="secondary" fullWidth>إلغاء</Button>
                  <Button variant="secondary" forceState="hover" fullWidth>إلغاء</Button>
                  <Button variant="secondary" forceState="focus" fullWidth>إلغاء</Button>
                  <Button variant="secondary" forceState="active" fullWidth>إلغاء</Button>
                  <Button variant="secondary" forceState="disabled" fullWidth>إلغاء</Button>
                  <Button variant="secondary" forceState="loading" fullWidth>إلغاء</Button>

                  {/* 3. Ghost */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Ghost (تجاهل)</span>
                  <Button variant="ghost" fullWidth>تجاهل</Button>
                  <Button variant="ghost" forceState="hover" fullWidth>تجاهل</Button>
                  <Button variant="ghost" forceState="focus" fullWidth>تجاهل</Button>
                  <Button variant="ghost" forceState="active" fullWidth>تجاهل</Button>
                  <Button variant="ghost" forceState="disabled" fullWidth>تجاهل</Button>
                  <Button variant="ghost" forceState="loading" fullWidth>تجاهل</Button>

                  {/* 4. Soft */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Soft (أرشفة)</span>
                  <Button variant="soft" fullWidth>أرشفة</Button>
                  <Button variant="soft" forceState="hover" fullWidth>أرشفة</Button>
                  <Button variant="soft" forceState="focus" fullWidth>أرشفة</Button>
                  <Button variant="soft" forceState="active" fullWidth>أرشفة</Button>
                  <Button variant="soft" forceState="disabled" fullWidth>أرشفة</Button>
                  <Button variant="soft" forceState="loading" fullWidth>أرشفة</Button>

                  {/* 5. Accent */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Accent (توكيل)</span>
                  <Button variant="accent" fullWidth>توكيل</Button>
                  <Button variant="accent" forceState="hover" fullWidth>توكيل</Button>
                  <Button variant="accent" forceState="focus" fullWidth>توكيل</Button>
                  <Button variant="accent" forceState="active" fullWidth>توكيل</Button>
                  <Button variant="accent" forceState="disabled" fullWidth>توكيل</Button>
                  <Button variant="accent" forceState="loading" fullWidth>توكيل</Button>

                  {/* 6. Danger */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Danger (شطب)</span>
                  <Button variant="danger" fullWidth>شطب</Button>
                  <Button variant="danger" forceState="hover" fullWidth>شطب</Button>
                  <Button variant="danger" forceState="focus" fullWidth>شطب</Button>
                  <Button variant="danger" forceState="active" fullWidth>شطب</Button>
                  <Button variant="danger" forceState="disabled" fullWidth>شطب</Button>
                  <Button variant="danger" forceState="loading" fullWidth>شطب</Button>

                  {/* 7. Outline danger */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Outline danger (حذف)</span>
                  <Button variant="outline-danger" fullWidth>حذف</Button>
                  <Button variant="outline-danger" forceState="hover" fullWidth>حذف</Button>
                  <Button variant="outline-danger" forceState="focus" fullWidth>حذف</Button>
                  <Button variant="outline-danger" forceState="active" fullWidth>حذف</Button>
                  <Button variant="outline-danger" forceState="disabled" fullWidth>حذف</Button>
                  <Button variant="outline-danger" forceState="loading" fullWidth>حذف</Button>

                  {/* 8. Link */}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>Link (فتح الملف)</span>
                  <Button variant="link" fullWidth>فتح الملف</Button>
                  <Button variant="link" forceState="hover" fullWidth>فتح الملف</Button>
                  <Button variant="link" forceState="focus" fullWidth>فتح الملف</Button>
                  <Button variant="link" forceState="active" fullWidth>فتح الملف</Button>
                  <Button variant="link" forceState="disabled" fullWidth>فتح الملف</Button>
                  <Button variant="link" forceState="loading" fullWidth>فتح الملف</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المقاسات والأزرار الخاصة */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            <Card bordered shadow>
              <CardHeader bordered>
                <CardTitle>أحجام الأزرار والأيقونات</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Button size="xs" variant="primary">XS (26px)</Button>
                    <Button size="sm" variant="primary">Small (32px)</Button>
                    <Button size="md" variant="primary">Medium (36px)</Button>
                    <Button size="lg" variant="primary">Large (46px)</Button>
                  </div>

                  <div style={{ height: "1px", background: "var(--border)" }} />

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <Button size="icon-sm" variant="secondary">
                      <Icon name="edit" size={17} />
                    </Button>
                    <Button size="icon" variant="secondary">
                      <Icon name="print" size={20} />
                    </Button>
                    <Button size="icon" variant="soft">
                      <Icon name="attach_file" size={20} />
                    </Button>
                    <Button size="icon-lg" variant="primary">
                      <Icon name="add" size={24} />
                    </Button>
                    <Button size="icon" variant="outline-danger">
                      <Icon name="delete" size={20} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card bordered shadow>
              <CardHeader bordered>
                <CardTitle>مجموعات وأزرار مركبة (Button Groups)</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <ButtonGroup>
                    <Button variant="soft" size="sm">الكل</Button>
                    <Button variant="ghost" size="sm">نشطة</Button>
                    <Button variant="ghost" size="sm">مؤجلة</Button>
                    <Button variant="ghost" size="sm">مغلقة</Button>
                  </ButtonGroup>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Button variant="primary" startIcon={<Icon name="save" size={18} />}>
                      حفظ ومتابعة
                    </Button>
                    <Button variant="secondary" endIcon={<Icon name="arrow_back" size={18} />}>
                      الرول
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* التبويب 2: الحقول والتحكم */}
      {activeTab === "forms" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {/* حقول الإدخال وحالاتها */}
          <Card bordered shadow>
            <CardHeader bordered>
              <CardTitle>حقول الإدخال وحالاتها الـ 7</CardTitle>
              <CardDescription>Default · Focus · Filled · Error · Success · Disabled · Readonly</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Input
                  label="Default"
                  placeholder="اسم الموكّل"
                  helperText="الاسم كما في التوكيل الرسمي"
                />
                <Input
                  label="Focus"
                  placeholder="اسم الموكّل"
                  forceState="focus"
                  helperText="الحقل قيد الكتابة الآن"
                />
                <Input
                  label="Filled"
                  defaultValue="شركة النيل للتوريدات"
                  forceState="filled"
                  helperText="قيمة مُدخلة"
                />
                <Input
                  label="Error *"
                  defaultValue="2026/41"
                  forceState="error"
                  errorMessage="رقم القضية غير مكتمل (السنة/الرقم)"
                  endIcon={<Icon name="error" size={18} />}
                />
                <Input
                  label="Success"
                  defaultValue="2026/4187"
                  forceState="success"
                  successMessage="الرقم متاح ولم يُستخدم قبل ذلك"
                  endIcon={<Icon name="check_circle" size={18} />}
                />
                <Input
                  label="Disabled"
                  defaultValue="لا يمكن التعديل"
                  forceState="disabled"
                  helperText="تحتاج صلاحية أعلى"
                />
                <Input
                  label="Readonly + أيقونة"
                  defaultValue="السجل العام — قيد رقم 4187"
                  forceState="readonly"
                  startIcon={<Icon name="lock" size={18} />}
                />
                <Input
                  label="مع لاحقة عملة"
                  defaultValue="150,000"
                  suffixNode="ج.م"
                />
                <div style={{ gridColumn: "span 2" }}>
                  <Textarea
                    label="منطقة نص (موضوع الدعوى)"
                    defaultValue="بموجب التوكيل رقم 1442/ب لسنة 2026، ننيب المحامي عن الموكّل في المرافعة أمام محكمة اقتصادية القاهرة…"
                    characterCount={{ current: 112, max: 400 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الاختيارات والقوائم ومفاتيح التبديل */}
          <Card bordered shadow>
            <CardHeader bordered>
              <CardTitle>أدوات التحكم والاختيار</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* مفتاح التبديل (Switch) */}
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: "8px" }}>
                    مفتاح التبديل (Switch):
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <Switch
                      checked={switchState}
                      onChange={setSwitchState}
                      label={switchState ? "مفعل (Primary)" : "معطل"}
                    />
                    <Switch
                      checked={true}
                      color="success"
                      label="مفعل (Success)"
                    />
                    <Switch
                      size="sm"
                      checked={true}
                      label="صغير (Small)"
                    />
                    <Switch
                      disabled
                      checked={false}
                      label="معطل غير محدد"
                    />
                  </div>
                </div>

                <div style={{ height: "1px", background: "var(--border)" }} />

                {/* مربعات الاختيار Checkboxes */}
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: "8px" }}>
                    مربعات الاختيار (Checkbox):
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <Checkbox label="غير محدد" />
                    <Checkbox defaultChecked label="محدد" />
                    <Checkbox disabled label="معطل" />
                    <Checkbox disabled defaultChecked label="معطل ومحدد" />
                  </div>
                </div>

                <div style={{ height: "1px", background: "var(--border)" }} />

                {/* أزرار الاختيار الأحادي Radios */}
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: "8px" }}>
                    أزرار الاختيار الأحادي (Radio):
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <Radio name="court_grade" defaultChecked label="ابتدائي" />
                    <Radio name="court_grade" label="استئناف" />
                    <Radio name="court_grade" disabled label="نقض" />
                  </div>
                </div>

                <div style={{ height: "1px", background: "var(--border)" }} />

                {/* القوائم المنسدلة */}
                <Select
                  label="محكمة الاختصاص (Select)"
                  options={[
                    { value: "south_cairo", label: "محكمة جنوب القاهرة الابتدائية" },
                    { value: "econ_cairo", label: "محكمة اقتصادية القاهرة" },
                    { value: "family_heliopolis", label: "محكمة أسرة مصر الجديدة" },
                  ]}
                />

                {/* الاختيار المتعدد بالوسوم */}
                <MultiSelect
                  label="تصنيف القضية (Multi-Select Tags)"
                  tags={tags}
                  onRemoveTag={(val) => setTags((prev) => prev.filter((t) => t.value !== val))}
                  onAddTag={(lbl) =>
                    setTags((prev) => [
                      ...prev,
                      { value: `tag-${Date.now()}`, label: lbl, color: "primary" },
                    ])
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* التبويب 3: البيانات والوسوم والجداول */}
      {activeTab === "data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* شريط الشارات وحالات المستندات الخمس */}
          <Card bordered shadow>
            <CardHeader bordered>
              <div>
                <CardTitle>الشارات الدلالية وحالات المستندات الخمس</CardTitle>
                <CardDescription>
                  الشارات الدلالية تعتمد على الرموز فقط، وحالات المستندات الخمس مميزة بنص واضح دون الاعتماد على اللون بمفرده.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: "8px" }}>
                    حالات المستندات الخمس المعتمدة في القالب:
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Badge documentStatus="draft" />
                    <Badge documentStatus="review" />
                    <Badge documentStatus="signed" />
                    <Badge documentStatus="filed" />
                    <Badge documentStatus="final" />
                  </div>
                </div>

                <div style={{ height: "1px", background: "var(--border)" }} />

                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: "8px" }}>
                    شارات الحالات العامة:
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Badge color="primary">أساسي</Badge>
                    <Badge color="success">نشطة (--success)</Badge>
                    <Badge color="warn">مؤجلة (--warn)</Badge>
                    <Badge color="danger">متأخرة / عاجلة (--danger)</Badge>
                    <Badge color="info">استئناف (--info)</Badge>
                    <Badge color="accent">تحكيم (--accent)</Badge>
                  </div>
                </div>

                <div style={{ height: "1px", background: "var(--border)" }} />

                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: "8px" }}>
                    أنماط الشارات (Styles):
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Badge variant="soft" color="primary">Soft</Badge>
                    <Badge variant="solid" color="primary">Solid</Badge>
                    <Badge variant="outline" color="primary">Outline</Badge>
                    <Badge variant="dot" color="success">Dot Indicator</Badge>
                    <Badge variant="soft" color="warn" icon={<Icon name="schedule" size={14} />}>
                      مع أيقونة
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* شريط الأدوات والتصفية متعددة القيم */}
          <Card bordered shadow>
            <CardHeader bordered>
              <CardTitle>شريط الأدوات والتصفية متعددة القيم (Multi-Value FilterBar)</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <Toolbar align="between">
                  <SearchInput />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="secondary" startIcon={<Icon name="download" size={17} />}>
                      تصدير
                    </Button>
                    <Button variant="primary" startIcon={<Icon name="add" size={17} />}>
                      قضية جديدة
                    </Button>
                  </div>
                </Toolbar>

                <FilterBar
                  fields={[
                    {
                      id: "status",
                      label: "حالة الملف",
                      options: [
                        { value: "active", label: "نشطة", count: 248 },
                        { value: "delayed", label: "مؤجلة", count: 34 },
                        { value: "urgent", label: "عاجلة", count: 17 },
                        { value: "closed", label: "مغلقة", count: 89 },
                      ],
                    },
                    {
                      id: "court",
                      label: "المحكمة",
                      options: [
                        { value: "commercial", label: "اقتصادية القاهرة", count: 114 },
                        { value: "civil", label: "جنوب القاهرة الابتدائية", count: 82 },
                        { value: "family", label: "أسرة مصر الجديدة", count: 52 },
                      ],
                    },
                  ]}
                  selectedValues={filterValues}
                  onChange={setFilterValues}
                  onReset={() => setFilterValues({})}
                  totalCount={348}
                  filteredCount={selectedRows.length}
                />
              </div>
            </CardContent>
          </Card>

          {/* جدول بيانات السجل المتفاعل مع --rowpad */}
          <Card bordered shadow>
            <CardHeader bordered>
              <div>
                <CardTitle>جدول بيانات القضايا (تفاعل مع --rowpad وتحديد الصفوف)</CardTitle>
                <CardDescription>
                  الحشوة العمودية للخلايا تتبع --rowpad (المضبوط حالياً على {rowPads[density]})
                </CardDescription>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11.5px", color: "var(--primary)", fontWeight: 600 }}>
                  {selectedRows.length} صفوف محددة
                </span>
                <Button variant="secondary" size="xs" startIcon={<Icon name="label" size={14} />}>
                  وسم
                </Button>
                <Button variant="outline-danger" size="xs" startIcon={<Icon name="delete" size={14} />}>
                  شطب
                </Button>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: "44px" }}>
                    <Checkbox
                      checked={selectedRows.length === 4}
                      indeterminate={selectedRows.length > 0 && selectedRows.length < 4}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(["2026/4187", "2026/4210", "2026/3902", "2025/7714"]);
                        } else {
                          setSelectedRows([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead sortable sorted="desc">رقم القيد</TableHead>
                  <TableHead>الموكّل</TableHead>
                  <TableHead>الأتعاب</TableHead>
                  <TableHead>نسبة الإنجاز</TableHead>
                  <TableHead>حالة القضية</TableHead>
                  <TableHead>مستند الدعوى</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    id: "2026/4187",
                    client: "شركة النيل للتوريدات",
                    fee: "240,000 ج.م",
                    pct: 78,
                    badgeColor: "success" as const,
                    badgeText: "نشطة",
                    docStatus: "signed" as const,
                  },
                  {
                    id: "2026/4210",
                    client: "ورثة المرحوم سامي عوض",
                    fee: "95,000 ج.م",
                    pct: 34,
                    badgeColor: "danger" as const,
                    badgeText: "عاجلة",
                    docStatus: "review" as const,
                  },
                  {
                    id: "2026/3902",
                    client: "هالة جمال الدين",
                    fee: "60,000 ج.م",
                    pct: 52,
                    badgeColor: "warn" as const,
                    badgeText: "مؤجلة",
                    docStatus: "draft" as const,
                  },
                  {
                    id: "2025/7714",
                    client: "مصنع العروبة للحديد",
                    fee: "310,000 ج.م",
                    pct: 91,
                    badgeColor: "info" as const,
                    badgeText: "قيد الاستئناف",
                    docStatus: "filed" as const,
                  },
                ].map((row) => {
                  const isSelected = selectedRows.includes(row.id);
                  return (
                    <TableRow key={row.id} selected={isSelected}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                        />
                      </TableCell>
                      <TableCell style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {row.id}
                      </TableCell>
                      <TableCell>{row.client}</TableCell>
                      <TableCell style={{ fontVariantNumeric: "tabular-nums" }}>{row.fee}</TableCell>
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              flex: 1,
                              maxWidth: "110px",
                              height: "6px",
                              borderRadius: "99px",
                              background: "var(--surface3)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${row.pct}%`,
                                height: "100%",
                                background: row.pct > 70 ? "var(--success)" : "var(--primary)",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text2)" }}>{row.pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color={row.badgeColor}>{row.badgeText}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge documentStatus={row.docStatus} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* التبويب 4: التنبيهات وهياكل التحميل والحالات الفارغة */}
      {activeTab === "feedback" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {/* التنبيهات (Alerts) */}
          <Card bordered shadow>
            <CardHeader bordered>
              <CardTitle>التنبيهات الدلالية (Alerts)</CardTitle>
              <CardDescription>info · warn · danger · success · neutral</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Alert
                  type="info"
                  title="تحديث الرول التلقائي"
                  onClose={() => {}}
                >
                  تمت مزامنة 34 جلسة من بوابة المحاكم الإلكترونية قبل 10 دقائق.
                </Alert>

                <Alert
                  type="success"
                  title="تم حفظ المذكرة بنجاح"
                  onClose={() => {}}
                >
                  أُضيفت إلى ملف القضية 2025/7714 ونُسخت في الأرشيف العام.
                </Alert>

                <Alert
                  type="warn"
                  title="ميعاد على وشك الانتهاء"
                  actions={
                    <>
                      <Button variant="danger" size="xs">تجهيز الآن</Button>
                      <Button variant="secondary" size="xs">تأجيل التذكير</Button>
                    </>
                  }
                >
                  مذكرة الدفاع في القضية 2026/4210 مطلوبة خلال 48 ساعة.
                </Alert>

                <Alert
                  type="danger"
                  title="فشل رفع المستند"
                  onClose={() => {}}
                >
                  حجم الملف يتجاوز 20 ميجابايت — يُرجى ضغطه وإعادة المحاولة.
                </Alert>

                <Alert
                  type="neutral"
                  title="إجازة قضائية رسمية"
                >
                  من 20 إلى 24 سبتمبر — لا توجد جلسات مجدولة في المحاكم الابتدائية.
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* الحالات الفارغة وهياكل التحميل (Empty State & Skeleton) */}
          <Card bordered shadow>
            <CardHeader bordered>
              <CardTitle>حالات الفراغ وهياكل التحميل</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <EmptyState
                  title="لا توجد قضايا مطابقة"
                  description="جرّب توسيع نطاق التاريخ أو إزالة بعض عوامل التصفية الحالية."
                  action={<Button variant="primary" size="sm">إعادة ضبط التصفية</Button>}
                />

                <div style={{ height: "1px", background: "var(--border)" }} />

                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: "10px" }}>
                    هياكل التحميل (Skeleton with Shimmer):
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <Skeleton variant="text" width="60%" height={12} />
                        <Skeleton variant="text" width="40%" height={10} />
                      </div>
                    </div>
                    <Skeleton variant="rectangular" height={50} />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Skeleton variant="text" width="30%" height={10} />
                      <Skeleton variant="text" width="70%" height={10} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
