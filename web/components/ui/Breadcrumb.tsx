"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { PrefetchedNavLink } from "@/app/providers";
import { Skeleton } from "@/components/ui/Skeleton";
import { SHELL_NAV_SECTIONS } from "@/components/Shell";

/**
 * المسارات التي لا تظهر فيها القشرة ولا شريط المسار (BARE_ROUTES).
 */
const BARE_ROUTES = ["/sign-in", "/sign-up", "/invite"];

/**
 * واجهة بند شريط المسار.
 */
export interface BreadcrumbItemDef {
  /** التسمية النصية أو العنصر المرئي (مثل Skeleton أثناء التحميل) */
  label: React.ReactNode;
  /** رابط الوجهة إذا لم يكن البند هو الأخير */
  href?: string;
  /** هل هذا البند هو الصفحة الحالية المعروضة */
  isCurrent?: boolean;
}

/**
 * خصائص مكوّن شريط المسار.
 */
export interface BreadcrumbProps {
  /** إمكانية تمرير بنود مخصصة للتجاوز أو للاختبارات الآلية */
  items?: BreadcrumbItemDef[];
  /** أصناف CSS إضافية */
  className?: string;
  /** أنماط مضمنة إضافية */
  style?: React.CSSProperties;
}

/**
 * خريطة الكتالوج للمسارات المعروفة الثابتة الإضافية (خارج عناصر الشريط الجانبي الرئيسية).
 * تربط كل مسار بمفتاح ترجمته المعتمد في الكتالوج ليكون الكتالوج مصدر الحقيقة الوحيد.
 */
export const STATIC_ROUTE_CATALOG: Record<string, string> = {
  "/dashboard": "@legalos.shell.nav.dashboard",
  "/plans": "@legalos.shell.nav.plans",
  "/subscribe": "@legalos.shell.nav.subscribe",
  "/search": "@legalos.shell.search.button",
  "/settings": "@legalos.shell.nav.settings",
  "/settings/profile": "@legalos.settings.nav.profile",
  "/settings/appearance": "@legalos.settings.nav.appearance",
  "/settings/users": "@legalos.settings.nav.users",
};

/**
 * استخراج مفتاح الترجمة للمسار من الكتالوج الموحد (catalogs/shell.ts و catalogs/settings.ts).
 * يضمن تطابق التسميات بين الشريط الجانبي وإعدادات النظام وشريط المسار دون أي ازدواجية.
 */
export function getRouteCatalogKey(path: string): string | undefined {
  const normalized = path.replace(/\/$/, "") || "/";
  if (STATIC_ROUTE_CATALOG[normalized]) {
    return STATIC_ROUTE_CATALOG[normalized];
  }
  for (const section of SHELL_NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === normalized) return item.labelKey;
      if (item.alsoMatch && item.alsoMatch.includes(normalized)) return item.labelKey;
    }
  }
  return undefined;
}

/**
 * دالة مساعدة متوافقة مع التسمية السابقة getRouteLabelKey.
 */
export const getRouteLabelKey = getRouteCatalogKey;

/**
 * تحديد ما إذا كان المسار يمثل شاشة تفاصيل لسجل ديناميكي (Detail Route).
 *
 * القاعدة مقلوبة ومستندة للكتالوج تماماً:
 * 1. إذا كان المسار بالكامل مسجلاً في الكتالوج (سواء كان مساراً رئيسياً أو فرعياً مثل /settings/appearance)،
 *    فهو شاشة عادية معروفة وليس شاشة تفاصيل.
 * 2. إذا لم يكن للمسار الكامل مفتاح في الكتالوج، وكان مساره الأب مسجلاً في الكتالوج (مثل /matters/4187)،
 *    فإن القطعة الأخيرة هي معرّف سجل (Record ID) وتلك شاشة تفاصيل.
 */
export function isRecordDetailRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return false;

  // هل المسار الكامل مسجل في الكتالوج؟
  if (getRouteCatalogKey(pathname)) {
    return false;
  }

  // هل المسار الأب مسجل في الكتالوج؟
  const parentPath = "/" + segments.slice(0, -1).join("/");
  return Boolean(getRouteCatalogKey(parentPath));
}

/**
 * مكوّن مساعد يُتيح للشاشات المتخصصة (مثل شاشة تفاصيل النماذج ذات المستويات الشجرية)
 * تزويد شريط المسار المركزي في القشرة بقائمة مستويات مخصصة دون إعادة رسم شريط محلي مكرر.
 */
export function BreadcrumbOverride({ items }: { items: BreadcrumbItemDef[] }) {
  useEffect(() => {
    const event = new CustomEvent("legalos:breadcrumb-items", { detail: items });
    window.dispatchEvent(event);
    return () => {
      window.dispatchEvent(new CustomEvent("legalos:breadcrumb-items", { detail: null }));
    };
  }, [items]);

  return null;
}

/**
 * مكوّن شريط المسار الموحد (Breadcrumb) لنظام السجل (LegalOS / T-060).
 *
 * المواصفات الهندسية والبصرية:
 * - الحجم: 11.5px.
 * - لون الأجزاء السابقة: var(--text3).
 * - لون الجزء الحالي: var(--text2) بوزن 500 مع aria-current="page".
 * - الفاصل: chevron_left في RTL و chevron_right في LTR بحجم 15px.
 * - الفجوة: 7px.
 * - الموضع: أول عنصر داخل <main>، فوق <h1> مباشرةً.
 * - هيكل تحميل Skeleton بعرض معقول في شاشات التفاصيل أثناء جلب البيانات لمنع القفز البصري.
 * - صفر استدعاءات شبكة جديدة: استخلاص اسم السجل مباشرة من عنوان الشاشة المحمّل في DOM.
 * - فصل مراقب DOM فور استخلاص العنوان لتقليل استهلاك الموارد.
 */
export function Breadcrumb({ items: customItems, className = "", style }: BreadcrumbProps) {
  const pathname = usePathname() || "/";
  const t = useTranslator();
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  // حالة عنوان شاشة التفاصيل المستخلص من محتوى الصفحة
  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  // بنود التجاوز المخصصة المرسلة من شاشات ذات هيكلية شجرية خاصة
  const [overrideItems, setOverrideItems] = useState<BreadcrumbItemDef[] | null>(null);

  // تقسيم المسار إلى أجزاء
  const segments = useMemo(() => {
    return pathname.split("/").filter(Boolean);
  }, [pathname]);

  // تحديد نوع المسار استناداً إلى الكتالوج حصراً دون أي استثناءات يدوية
  const isDetailRoute = useMemo(() => {
    return isRecordDetailRoute(pathname);
  }, [pathname]);

  // الاستماع لبنود المسار المخصصة عند إرسالها من الشاشة النشطة
  useEffect(() => {
    const handleItemsOverride = (e: Event) => {
      const custom = e as CustomEvent<BreadcrumbItemDef[] | null>;
      setOverrideItems(custom.detail || null);
    };
    window.addEventListener("legalos:breadcrumb-items", handleItemsOverride);
    return () => {
      window.removeEventListener("legalos:breadcrumb-items", handleItemsOverride);
    };
  }, []);

  // إعادة ضبط حالة التجاوز والعنوان عند تغير المسار
  useEffect(() => {
    setOverrideItems(null);
    setDetailTitle(null);
  }, [pathname]);

  // مراقبة DOM داخل <main> لاستخراج اسم السجل المحمّل بالفعل دون أي نداء شبكة
  // مع فصل المراقب فوراً بمجرد الحصول على العنوان لتجنب استهلاك الموارد
  useEffect(() => {
    if (!isDetailRoute) {
      setDetailTitle(null);
      return;
    }

    const extractTitleFromDom = (): string | null => {
      const mainEl = document.querySelector("main");
      if (!mainEl) return null;

      // أولوية أولى: السمة الصريحة data-breadcrumb-title
      const explicitEl = mainEl.querySelector<HTMLElement>("[data-breadcrumb-title]");
      if (explicitEl) {
        const attr = explicitEl.getAttribute("data-breadcrumb-title");
        if (attr && attr.trim()) return attr.trim();
        if (explicitEl.textContent && explicitEl.textContent.trim()) {
          return explicitEl.textContent.trim();
        }
      }

      // أولوية ثانية: أول عنوان h1 أو h2 في محتوى الصفحة (مع استبعاد nav)
      const headings = mainEl.querySelectorAll<HTMLElement>("h1, h2");
      for (const h of headings) {
        if (h.closest("nav")) continue;
        const text = h.textContent ? h.textContent.trim() : "";
        if (text) return text;
      }
      return null;
    };

    // فحص أولي فوري: إذا كان العنوان متوفراً مسبقاً في DOM، لا داعي لتشغيل المراقب
    const immediate = extractTitleFromDom();
    if (immediate) {
      setDetailTitle(immediate);
      return;
    }

    // تشغيل المراقب مع فصله فور التقاط العنوان
    const mainElement = document.querySelector("main");
    if (!mainElement) return;

    const observer = new MutationObserver(() => {
      const title = extractTitleFromDom();
      if (title) {
        setDetailTitle(title);
        observer.disconnect(); // فصل المراقب فوراً عند الحصول على العنوان
      }
    });

    observer.observe(mainElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // الاستماع أيضاً للأحداث المخصصة في حال إرسال العنوان برمجياً
    const handleTitleEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setDetailTitle(custom.detail);
        observer.disconnect();
      }
    };
    window.addEventListener("legalos:breadcrumb-title", handleTitleEvent);

    return () => {
      observer.disconnect();
      window.removeEventListener("legalos:breadcrumb-title", handleTitleEvent);
    };
  }, [pathname, isDetailRoute]);

  // عدم التصيير في شاشات تسجيل الدخول والاشتراك والدعوة (BARE_ROUTES)
  if (BARE_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  // بناء بنود شريط المسار
  const computedItems: BreadcrumbItemDef[] = useMemo(() => {
    // 1. أولوية البنود الممررة مباشرة عبر Props
    if (customItems) return customItems;
    // 2. أولوية البنود المخصصة المرسلة من الشاشة عبر BreadcrumbOverride
    if (overrideItems) return overrideItems;

    const homeLabel = t("@legalos.shell.breadcrumb.home");
    const homeItem: BreadcrumbItemDef = {
      label: homeLabel,
      href: "/dashboard",
    };

    // الحالة 1: شاشة لوحة التحكم المسطحة (/ أو /dashboard)
    if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
      return [
        homeItem,
        {
          label: t("@legalos.shell.nav.dashboard"),
          isCurrent: true,
        },
      ];
    }

    // الحالة 2: شاشة تفاصيل ديناميكية من ثلاثة مستويات (مثل /matters/[id] أو /clients/[id])
    if (isDetailRoute) {
      const rootSegment = segments[0];
      // مطابقة المسارات المترادفة (مثل /cases التي تتبع /matters، و /article التي تتبع /library)
      let parentHref = `/${rootSegment}`;
      if (rootSegment === "cases") parentHref = "/matters";
      if (rootSegment === "article") parentHref = "/library";

      const parentKey = getRouteCatalogKey(parentHref) || getRouteCatalogKey(`/${rootSegment}`);
      const parentLabel = parentKey ? t(parentKey) : rootSegment;

      const detailItemNode = detailTitle ? (
        detailTitle
      ) : (
        <Skeleton
          width="80px"
          height="12px"
          borderRadius="var(--rs)"
          className="inline-block"
          style={{ verticalAlign: "middle" }}
          aria-label={t("@legalos.shell.breadcrumb.loading")}
        />
      );

      return [
        homeItem,
        {
          label: parentLabel,
          href: parentHref,
        },
        {
          label: detailItemNode,
          isCurrent: true,
        },
      ];
    }

    // الحالة 3: شاشات مسطحة أو فرعية ثابتة مشتقة من الكتالوج
    // تعمل آلياً على الشاشات ذات المستوى الواحد (مثل /matters) والمتعددة كـ (/settings/appearance و /settings/users)
    const items: BreadcrumbItemDef[] = [homeItem];
    let accumulatedPath = "";

    for (let i = 0; i < segments.length; i++) {
      accumulatedPath += `/${segments[i]}`;
      const isLast = i === segments.length - 1;
      const catalogKey = getRouteCatalogKey(accumulatedPath);
      const label = catalogKey ? t(catalogKey) : segments[i];

      items.push({
        label,
        href: isLast ? undefined : accumulatedPath,
        isCurrent: isLast,
      });
    }

    return items;
  }, [customItems, overrideItems, segments, isDetailRoute, t, detailTitle]);

  // أيقونة الفاصل المناسبة للاتجاه دون استخدام transform
  const separatorIcon = isRtl ? "chevron_left" : "chevron_right";

  return (
    <nav
      aria-label={t("@legalos.shell.breadcrumb.ariaLabel")}
      className={`flex items-center text-[11.5px] ${className}`.trim()}
      style={{
        gap: "7px",
        fontSize: "11.5px",
        color: "var(--text3)",
        marginBottom: "16px",
        ...style,
      }}
    >
      {computedItems.map((item, index) => {
        const isLast = index === computedItems.length - 1;
        const key = `breadcrumb-item-${index}`;

        return (
          <React.Fragment key={key}>
            {index > 0 && (
              <span
                className="ms flex-none select-none"
                style={{
                  fontSize: "15px",
                  lineHeight: 1,
                  color: "var(--text3)",
                }}
                aria-hidden="true"
              >
                {separatorIcon}
              </span>
            )}
            {isLast || !item.href ? (
              <span
                aria-current={item.isCurrent || isLast ? "page" : undefined}
                className="truncate"
                style={{
                  color: "var(--text2)",
                  fontWeight: 500,
                }}
              >
                {item.label}
              </span>
            ) : (
              <PrefetchedNavLink
                href={item.href}
                className="truncate transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:rounded-[var(--rs)]"
                style={{
                  color: "var(--text3)",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </PrefetchedNavLink>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
