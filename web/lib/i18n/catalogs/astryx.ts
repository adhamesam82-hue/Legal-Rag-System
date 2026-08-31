import type { Catalog } from "@astryxdesign/core/i18n";

/**
 * Arabic for the design system's own chrome.
 *
 * Astryx components resolve their built-in strings — a selector's
 * "Select…", a date field's "Select a date", the command palette's
 * "No results", a table's "No data" — through the same
 * InternationalizationProvider this app already mounts, falling back to the
 * shipped English catalog when the active locale has no entry. Nothing was
 * ever registered for `ar`, so every one of those defaults came out in
 * English inside an otherwise Arabic, right-to-left screen.
 *
 * Fixing that at the call sites would have meant a `placeholder` prop on
 * fifty-four controls and a new one on every control added after, forgotten
 * the first time somebody was in a hurry. Fixing it here is one entry per
 * string, and it covers the components this app has not used yet.
 *
 * `en` is deliberately empty: English IS the shipped catalog, and repeating
 * it here would create a second copy to keep in step with the package.
 *
 * ICU placeholders ({label}, {count}, plural forms) must survive translation
 * exactly as written — the runtime formats against them by name.
 */

export const en: Catalog = {};

export const ar: Catalog = {
  // --- form controls --------------------------------------------------------
  "@astryx.selector.placeholder": { defaultMessage: "اختر…" },
  "@astryx.selector.searchPlaceholder": { defaultMessage: "بحث…" },
  "@astryx.selector.searchOptions": { defaultMessage: "البحث في الخيارات" },
  "@astryx.selector.clearLabel": { defaultMessage: "مسح {label}" },
  "@astryx.multiSelector.selectPlaceholder": { defaultMessage: "اختر…" },
  "@astryx.multiSelector.selectAll": { defaultMessage: "تحديد الكل" },
  "@astryx.multiSelector.searchPlaceholder": { defaultMessage: "بحث…" },
  "@astryx.multiSelector.searchOptions": { defaultMessage: "البحث في الخيارات" },
  "@astryx.multiSelector.clearAll": { defaultMessage: "مسح كل {label}" },
  "@astryx.textInput.clearLabel": { defaultMessage: "مسح {label}" },
  "@astryx.numberInput.clearLabel": { defaultMessage: "مسح {label}" },
  "@astryx.fileInput.clearLabel": { defaultMessage: "مسح {label}" },
  "@astryx.fileInput.required": { defaultMessage: "مطلوب" },
  "@astryx.fileInput.triggerWithFiles": { defaultMessage: "{label}، {fileNames}" },
  "@astryx.input.statusButton.error": { defaultMessage: "تفاصيل الخطأ" },
  "@astryx.input.statusButton.warning": { defaultMessage: "تفاصيل التنبيه" },
  "@astryx.input.statusButton.success": { defaultMessage: "تفاصيل النجاح" },
  "@astryx.token.remove": { defaultMessage: "إزالة {label}" },
  "@astryx.tokenizer.clearAll": { defaultMessage: "مسح الكل" },
  "@astryx.checkboxList.item.checkbox": { defaultMessage: "خانة اختيار" },

  // --- dates and times ------------------------------------------------------
  "@astryx.dateInput.placeholder": { defaultMessage: "اختر تاريخًا" },
  "@astryx.dateInput.dialogLabel": { defaultMessage: "اختيار التاريخ" },
  "@astryx.dateInput.closeCalendar": { defaultMessage: "إغلاق التقويم" },
  "@astryx.dateInput.openCalendar": { defaultMessage: "فتح التقويم" },
  "@astryx.dateInput.toggleCalendarClose": { defaultMessage: "إغلاق التقويم" },
  "@astryx.dateInput.clear": { defaultMessage: "مسح {label}" },
  "@astryx.dateTimeInput.placeholder": { defaultMessage: "اختر تاريخًا" },
  "@astryx.dateTimeInput.timePlaceholder": { defaultMessage: "اختر وقتًا" },
  "@astryx.dateTimeInput.dialogLabel": { defaultMessage: "اختيار التاريخ" },
  "@astryx.dateTimeInput.timeSuffix": { defaultMessage: "وقت {label}" },
  "@astryx.dateRangeInput.placeholder": { defaultMessage: "اختر مدى تاريخ" },
  "@astryx.dateRangeInput.dialogLabel": { defaultMessage: "اختيار مدى التاريخ" },
  "@astryx.dateRangeInput.presetDateRanges": { defaultMessage: "مديات جاهزة" },
  "@astryx.timeInput.placeholder": { defaultMessage: "اختر وقتًا" },
  "@astryx.timeInput.clearLabel": { defaultMessage: "مسح {label}" },
  "@astryx.calendar.previousMonth": { defaultMessage: "الشهر السابق" },
  "@astryx.calendar.nextMonth": { defaultMessage: "الشهر التالي" },
  "@astryx.calendar.daySelected": { defaultMessage: "{date}، محدَّد" },
  "@astryx.calendar.dayRangeStart": { defaultMessage: "{date}، بداية المدى" },
  "@astryx.calendar.dayRangeEnd": { defaultMessage: "{date}، نهاية المدى" },
  "@astryx.calendar.dayRangeStartAndEnd": {
    defaultMessage: "{date}، بداية المدى ونهايته",
  },
  "@astryx.calendar.dayInRange": { defaultMessage: "{date}، داخل المدى" },
  "@astryx.calendar.rangeStartAnnounce": {
    defaultMessage: "تاريخ البداية {date}. اختر تاريخ النهاية.",
  },
  "@astryx.calendar.rangeCompleteAnnounce": {
    defaultMessage: "المدى المحدَّد: من {start} إلى {end}.",
  },

  // --- typeahead and command palette ---------------------------------------
  "@astryx.typeahead.searchPlaceholder": { defaultMessage: "بحث…" },
  "@astryx.typeahead.emptySearchResults": { defaultMessage: "لا نتائج" },
  "@astryx.typeahead.loading": { defaultMessage: "جارٍ التحميل" },
  "@astryx.typeahead.searchResults": { defaultMessage: "نتائج البحث" },
  "@astryx.typeahead.clearSelection": { defaultMessage: "إلغاء الاختيار" },
  "@astryx.commandPalette.label": { defaultMessage: "لوحة الأوامر" },
  "@astryx.commandPalette.list.label": { defaultMessage: "الأوامر" },
  "@astryx.commandPalette.input.placeholder": { defaultMessage: "بحث…" },
  "@astryx.commandPalette.emptySearch": { defaultMessage: "لا نتائج" },
  "@astryx.commandPalette.emptyBootstrap": { defaultMessage: "اكتب للبحث" },
  "@astryx.commandPalette.loading": { defaultMessage: "جارٍ التحميل" },
  "@astryx.commandPalette.noResultsFor": { defaultMessage: "لا نتائج لـ {query}" },
  "@astryx.commandPalette.resultCount": {
    defaultMessage:
      "{count, plural, zero {لا نتائج} one {نتيجة واحدة} two {نتيجتان} few {{count} نتائج} many {{count} نتيجة} other {{count} نتيجة}}",
  },

  // --- tables ---------------------------------------------------------------
  "@astryx.table.label": { defaultMessage: "جدول" },
  "@astryx.table.noData": { defaultMessage: "لا توجد بيانات" },
  "@astryx.table.filter.allPlaceholder": { defaultMessage: "الكل" },
  "@astryx.table.filter.reset": { defaultMessage: "إعادة ضبط" },
  "@astryx.table.filter.apply": { defaultMessage: "تطبيق" },
  "@astryx.table.selection.selectAllRows": { defaultMessage: "تحديد كل الصفوف" },
  "@astryx.table.selection.selectRow": { defaultMessage: "تحديد الصف" },
  "@astryx.table.selection.selectRowNamed": { defaultMessage: "تحديد {label}" },
  "@astryx.table.sort.ascending": { defaultMessage: "ترتيب تصاعدي" },
  "@astryx.table.sort.descending": { defaultMessage: "ترتيب تنازلي" },
  "@astryx.table.sort.clear": { defaultMessage: "إلغاء الترتيب" },
  "@astryx.table.sort.direction.ascending": { defaultMessage: "تصاعديًا" },
  "@astryx.table.sort.direction.descending": { defaultMessage: "تنازليًا" },
  "@astryx.table.sort.sortBy": { defaultMessage: "الترتيب حسب {label}" },
  "@astryx.table.sort.sortedBy": {
    defaultMessage: "الترتيب حسب {label}، مرتَّب {direction}",
  },
  "@astryx.table.sort.sortedByWithPriority": {
    defaultMessage:
      "الترتيب حسب {label}، مرتَّب {direction}، الأولوية {rank, number} من {total, number}",
  },
  "@astryx.table.pagination.label": { defaultMessage: "تصفّح الجدول" },
  "@astryx.tableFiltering.filterByColumn": { defaultMessage: "تصفية {header}" },
  "@astryx.tableGroupedRows.expandGroup": { defaultMessage: "توسيع المجموعة {groupKey}" },
  "@astryx.tableGroupedRows.collapseGroup": { defaultMessage: "طيّ المجموعة {groupKey}" },
  "@astryx.tableRowExpansion.collapseRow": { defaultMessage: "طيّ الصف" },
  "@astryx.tableRowExpansion.expandRow": { defaultMessage: "توسيع الصف" },
  "@astryx.tableRowExpansion.collapseAllRows": { defaultMessage: "طيّ كل الصفوف" },
  "@astryx.tableRowExpansion.expandAllRows": { defaultMessage: "توسيع كل الصفوف" },
  "@astryx.tableTree.collapseRow": { defaultMessage: "طيّ الصف" },
  "@astryx.tableTree.expandRow": { defaultMessage: "توسيع الصف" },
  "@astryx.tableTree.collapseAllRows": { defaultMessage: "طيّ كل الصفوف" },
  "@astryx.tableTree.expandAllRows": { defaultMessage: "توسيع كل الصفوف" },
  "@astryx.treeList.toggleChildren": { defaultMessage: "إظهار العناصر الفرعية" },

  // --- pagination -----------------------------------------------------------
  "@astryx.pagination.label": { defaultMessage: "تصفّح الصفحات" },
  "@astryx.pagination.previous": { defaultMessage: "الصفحة السابقة" },
  "@astryx.pagination.next": { defaultMessage: "الصفحة التالية" },
  "@astryx.pagination.goToPage": { defaultMessage: "الانتقال إلى الصفحة {page, number}" },
  "@astryx.pagination.pageIndicators": { defaultMessage: "مؤشرات الصفحات" },
  "@astryx.pagination.itemsPerPage": { defaultMessage: "عناصر في الصفحة" },
  "@astryx.pagination.count": {
    defaultMessage: "{from, number}–{to, number} من {total, number}",
  },
  "@astryx.pagination.pageOfTotal": {
    defaultMessage: "الصفحة {current, number} من {total, number}",
  },
  "@astryx.pagination.pageAnnounce": { defaultMessage: "الصفحة {current, number}" },

  // --- navigation and layout chrome ----------------------------------------
  "@astryx.appShell.mobileNavigation": { defaultMessage: "التنقّل على الهاتف" },
  "@astryx.sideNav.label": { defaultMessage: "القائمة الجانبية" },
  "@astryx.sideNav.resizeSidebar": { defaultMessage: "تغيير عرض القائمة" },
  "@astryx.sideNav.heading.openMenu": { defaultMessage: "فتح القائمة" },
  "@astryx.sideNav.heading.dialogLabel": { defaultMessage: "قائمة التنقّل" },
  "@astryx.sideNavCollapseButton.expandSidebar": { defaultMessage: "توسيع القائمة" },
  "@astryx.sideNavCollapseButton.collapseSidebar": { defaultMessage: "طيّ القائمة" },
  "@astryx.sideNavItem.expand": { defaultMessage: "توسيع {label}" },
  "@astryx.sideNavItem.collapse": { defaultMessage: "طيّ {label}" },
  "@astryx.topNav.heading.openMenu": { defaultMessage: "فتح القائمة" },
  "@astryx.topNav.heading.dialogLabel": { defaultMessage: "قائمة التنقّل" },
  "@astryx.topNav.landmarkLabel": { defaultMessage: "الشريط العلوي" },
  "@astryx.mobileNav.navigation": { defaultMessage: "التنقّل" },
  "@astryx.mobileNav.closeNavigation": { defaultMessage: "إغلاق التنقّل" },
  "@astryx.mobileNav.toggle.open": { defaultMessage: "فتح التنقّل" },
  "@astryx.tabList.label": { defaultMessage: "التبويبات" },
  "@astryx.breadcrumbs.label": { defaultMessage: "مسار التنقّل" },
  "@astryx.outline.label": { defaultMessage: "قائمة المحتويات" },
  "@astryx.link.newTab": { defaultMessage: "(يفتح في تبويب جديد)" },
  "@astryx.resizable.handle.label": { defaultMessage: "مقبض تغيير الحجم" },

  // --- overlays and menus ---------------------------------------------------
  "@astryx.dialog.close": { defaultMessage: "إغلاق" },
  "@astryx.alertDialog.cancel": { defaultMessage: "إلغاء" },
  "@astryx.popover.close": { defaultMessage: "إغلاق" },
  "@astryx.dropdownMenu.label": { defaultMessage: "قائمة" },
  "@astryx.contextMenu.label": { defaultMessage: "قائمة السياق" },
  "@astryx.moreMenu.label": { defaultMessage: "خيارات أخرى" },
  "@astryx.banner.dismiss": { defaultMessage: "إخفاء" },
  "@astryx.banner.collapse": { defaultMessage: "طيّ" },
  "@astryx.banner.expand": { defaultMessage: "توسيع" },
  "@astryx.toast.dismiss": { defaultMessage: "إخفاء الإشعار" },
  "@astryx.toast.viewport": { defaultMessage: "الإشعارات" },
  "@astryx.lightbox.close": { defaultMessage: "إغلاق" },
  "@astryx.lightbox.previous": { defaultMessage: "السابق" },
  "@astryx.lightbox.next": { defaultMessage: "التالي" },
  "@astryx.lightbox.mediaViewer": { defaultMessage: "عارض الوسائط" },
  "@astryx.carousel.label": { defaultMessage: "شريط عرض" },
  "@astryx.carousel.scrollLeft": { defaultMessage: "تمرير لليسار" },
  "@astryx.carousel.scrollRight": { defaultMessage: "تمرير لليمين" },
  "@astryx.carousel.slideLabel": {
    defaultMessage: "الشريحة {current, number} من {total, number}",
  },

  // --- avatars, citations, code, markdown ----------------------------------
  "@astryx.avatar.nameWithStatus": { defaultMessage: "{name}، {status}" },
  "@astryx.avatarGroup.label": { defaultMessage: "الصور الشخصية" },
  "@astryx.avatarGroup.keyboardHint": {
    defaultMessage: "استخدم مفاتيح الأسهم للتنقّل بين الصور",
  },
  "@astryx.citation.label": { defaultMessage: "المرجع {number}: {title}" },
  "@astryx.codeBlock.code": { defaultMessage: "كود" },
  "@astryx.codeBlock.copyCode": { defaultMessage: "نسخ الكود" },
  "@astryx.codeBlock.copied": { defaultMessage: "تم النسخ" },
  "@astryx.markdown.taskList": { defaultMessage: "قائمة مهام" },
  "@astryx.markdown.table": { defaultMessage: "جدول" },
  "@astryx.thumbnail.remove": { defaultMessage: "إزالة {accessibleName}" },
  "@astryx.thumbnail.open": { defaultMessage: "فتح {accessibleName}" },
  "@astryx.thumbnail.fallbackName": { defaultMessage: "صورة مصغّرة" },

  // --- chat -----------------------------------------------------------------
  "@astryx.chat.status.sending": { defaultMessage: "جارٍ الإرسال" },
  "@astryx.chat.status.sent": { defaultMessage: "أُرسلت" },
  "@astryx.chat.status.delivered": { defaultMessage: "وصلت" },
  "@astryx.chat.status.read": { defaultMessage: "قُرئت" },
  "@astryx.chat.status.failed": { defaultMessage: "أخفقت" },
  "@astryx.chat.messageAriaLabel": { defaultMessage: "رسالة {status}" },
  "@astryx.chat.pastedText.expand": { defaultMessage: "توسيع" },
  "@astryx.chat.composer.placeholder": { defaultMessage: "اكتب رسالة…" },
  "@astryx.chat.composerDrawer.label": { defaultMessage: "العناصر" },
  "@astryx.chat.composerInput.label": { defaultMessage: "حقل الرسالة" },
  "@astryx.chat.speechRecognition.noSpeechDetected": {
    defaultMessage: "لم يُلتقط أي صوت.",
  },
  "@astryx.chatComposerDrawer.expand": { defaultMessage: "توسيع {label}" },
  "@astryx.chatComposerDrawer.collapse": { defaultMessage: "طيّ {label}" },
  "@astryx.chatDictationButton.startDictation": { defaultMessage: "بدء الإملاء" },
  "@astryx.chatDictationButton.stopDictation": { defaultMessage: "إيقاف الإملاء" },
  "@astryx.chatLayout.newMessages": { defaultMessage: "رسائل جديدة" },
  "@astryx.chatLayoutScrollButton.scrollToBottom": { defaultMessage: "النزول إلى الأسفل" },
  "@astryx.chatMessage.messageFrom": { defaultMessage: "رسالة من {sender}" },
  "@astryx.chatSendButton.send": { defaultMessage: "إرسال" },
  "@astryx.chatSendButton.stop": { defaultMessage: "إيقاف" },
  "@astryx.chatToolCalls.error": { defaultMessage: "خطأ: {message}" },
  "@astryx.chatToolCalls.groupLabel": { defaultMessage: "{count} استدعاء أداة" },
  "@astryx.chatTriggerMenu.suggestions": { defaultMessage: "اقتراحات" },

  // --- power search ---------------------------------------------------------
  "@astryx.powersearch.label": { defaultMessage: "بحث" },
  "@astryx.powersearch.placeholder": { defaultMessage: "بحث…" },
  "@astryx.powersearch.resultCount": {
    defaultMessage:
      "{count, plural, zero {لا نتائج} one {نتيجة واحدة} two {نتيجتان} few {{count} نتائج} many {{count} نتيجة} other {{count} نتيجة}}",
  },
  "@astryx.powersearch.editor.field": { defaultMessage: "الحقل" },
  "@astryx.powersearch.editor.operator": { defaultMessage: "المعامل" },
  "@astryx.powersearch.editor.addFilter": { defaultMessage: "+ إضافة تصفية" },
  "@astryx.powersearch.editor.removeFilter": { defaultMessage: "إزالة التصفية" },
  "@astryx.powersearch.editor.groupOperator": { defaultMessage: "معامل المجموعة" },
  "@astryx.powersearch.editor.group": { defaultMessage: "مجموعة" },
  "@astryx.powersearch.editor.delete": { defaultMessage: "حذف" },
  "@astryx.powersearch.editor.cancel": { defaultMessage: "إلغاء" },
  "@astryx.powersearch.editor.apply": { defaultMessage: "تطبيق" },
  "@astryx.powersearch.valueEditor.value": { defaultMessage: "القيمة" },
  "@astryx.powersearch.valueEditor.values": { defaultMessage: "القيم" },
  "@astryx.powersearch.valueEditor.time": { defaultMessage: "الوقت" },
  "@astryx.powersearch.valueEditor.date": { defaultMessage: "التاريخ" },
  "@astryx.powersearch.valueEditor.relativeDate": { defaultMessage: "تاريخ نسبي" },
  "@astryx.powersearch.valueEditor.startDate": { defaultMessage: "تاريخ البداية" },
  "@astryx.powersearch.valueEditor.endDate": { defaultMessage: "تاريخ النهاية" },
  "@astryx.powersearch.valueEditor.entities": { defaultMessage: "العناصر" },
  "@astryx.powersearch.valueEditor.searchPlaceholder": { defaultMessage: "بحث…" },
  "@astryx.powersearch.valueEditor.enterValuePlaceholder": {
    defaultMessage: "أدخل قيمة…",
  },
  "@astryx.powersearch.valueEditor.addValuesPlaceholder": {
    defaultMessage: "أضف قيمًا…",
  },
  "@astryx.powersearch.valueEditor.enterNumberPlaceholder": {
    defaultMessage: "أدخل رقمًا…",
  },
  "@astryx.powersearch.valueEditor.selectValuesPlaceholder": {
    defaultMessage: "اختر قيمًا…",
  },
  "@astryx.powersearch.valueEditor.itemsCount": {
    defaultMessage:
      "{count, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {{count} عناصر} many {{count} عنصرًا} other {{count} عنصر}}",
  },
  "@astryx.powersearch.valueEditor.entitiesCount": {
    defaultMessage:
      "{count, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {{count} عناصر} many {{count} عنصرًا} other {{count} عنصر}}",
  },
  "@astryx.powersearch.valueEditor.filtersCount": {
    defaultMessage:
      "{count, plural, zero {لا تصفيات} one {تصفية واحدة} two {تصفيتان} few {{count} تصفيات} many {{count} تصفية} other {{count} تصفية}}",
  },
  "@astryx.powersearch.valueEditor.dateRange": { defaultMessage: "مدى تاريخ" },
  "@astryx.powersearch.operator.contains": { defaultMessage: "يحتوي على" },
  "@astryx.powersearch.operator.notContains": { defaultMessage: "لا يحتوي على" },
  "@astryx.powersearch.operator.startsWith": { defaultMessage: "يبدأ بـ" },
  "@astryx.powersearch.operator.notStartsWith": { defaultMessage: "لا يبدأ بـ" },
  "@astryx.powersearch.operator.endsWith": { defaultMessage: "ينتهي بـ" },
  "@astryx.powersearch.operator.notEndsWith": { defaultMessage: "لا ينتهي بـ" },
  "@astryx.powersearch.operator.is": { defaultMessage: "يساوي" },
  "@astryx.powersearch.operator.isNot": { defaultMessage: "لا يساوي" },
  "@astryx.powersearch.operator.equals": { defaultMessage: "يساوي" },
  "@astryx.powersearch.operator.notEquals": { defaultMessage: "لا يساوي" },
  "@astryx.powersearch.operator.greaterThan": { defaultMessage: "أكبر من" },
  "@astryx.powersearch.operator.lessThan": { defaultMessage: "أصغر من" },
  "@astryx.powersearch.operator.greaterThanOrEqual": {
    defaultMessage: "أكبر من أو يساوي",
  },
  "@astryx.powersearch.operator.lessThanOrEqual": {
    defaultMessage: "أصغر من أو يساوي",
  },
  "@astryx.powersearch.operator.before": { defaultMessage: "قبل" },
  "@astryx.powersearch.operator.after": { defaultMessage: "بعد" },
  "@astryx.powersearch.operator.between": { defaultMessage: "بين" },
  "@astryx.powersearch.operator.isTrue": { defaultMessage: "صحيح" },
  "@astryx.powersearch.operator.isFalse": { defaultMessage: "خطأ" },
  "@astryx.powersearch.operator.isAnyOf": { defaultMessage: "أيٌّ من" },
  "@astryx.powersearch.operator.isNoneOf": { defaultMessage: "ولا واحد من" },
};
