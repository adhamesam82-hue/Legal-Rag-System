import type { Catalog } from "@astryxdesign/core/i18n";

// Strings owned by the visual distinction layer (T-035): the proximity bands
// a dated commitment is labelled with, and the empty-state copy for screens
// that had a filtered-out message but nothing to say when the firm simply
// has no records yet.

export const en: Catalog = {
  // The warning gradient, mild to severe. Short on purpose: each sits in a
  // badge next to an icon, and the date itself is printed beside it.
  "@legalos.distinction.proximity.thisWeek": { defaultMessage: "This week" },
  "@legalos.distinction.proximity.today": { defaultMessage: "Today" },
  "@legalos.distinction.proximity.overdue": { defaultMessage: "Overdue" },

  // The matters list used to show "No matters match your filters" to a firm
  // that had never opened one. A first-time screen says what goes here.
  "@legalos.distinction.matters.emptyTitle": { defaultMessage: "No matters yet" },
  "@legalos.distinction.matters.emptyDescription": {
    defaultMessage:
      "Every case, consultation and contract the firm handles lives here as a matter. Open the first one to start filing hearings, documents and time against it.",
  },
  "@legalos.distinction.matters.openFirst": { defaultMessage: "Open a matter" },
  // The matter file's subtitle used to carry the type in text; the type is
  // now the badge beside the number, so the subtitle keeps only the date.
  "@legalos.distinction.matters.openedOn": { defaultMessage: "opened {date}" },

  // The calendar's day rail and the tasks board had a title with no picture;
  // these are the lines that go under the picture.
  "@legalos.distinction.calendar.emptyDescription": {
    defaultMessage:
      "Hearings, case deadlines and task due dates for this day appear here once they are set on a matter.",
  },
  "@legalos.distinction.tasks.emptyDescription": {
    defaultMessage:
      "Tasks are added inside a matter, or from here with the button above. Assigned work across the firm collects on this board.",
  },
};

export const ar: Catalog = {
  "@legalos.distinction.proximity.thisWeek": { defaultMessage: "هذا الأسبوع" },
  "@legalos.distinction.proximity.today": { defaultMessage: "اليوم" },
  "@legalos.distinction.proximity.overdue": { defaultMessage: "متأخر" },

  "@legalos.distinction.matters.emptyTitle": { defaultMessage: "لا توجد قضايا بعد" },
  "@legalos.distinction.matters.emptyDescription": {
    defaultMessage:
      "كل قضية واستشارة وعقد يتولّاه المكتب يُسجَّل هنا قضيةً. افتح الأولى لتبدأ بقيد الجلسات والمستندات والوقت عليها.",
  },
  "@legalos.distinction.matters.openFirst": { defaultMessage: "افتح قضية" },
  "@legalos.distinction.matters.openedOn": { defaultMessage: "فُتحت في {date}" },

  "@legalos.distinction.calendar.emptyDescription": {
    defaultMessage:
      "تظهر هنا جلسات هذا اليوم ومواعيد القضايا واستحقاقات المهام بمجرد تحديدها في قضية.",
  },
  "@legalos.distinction.tasks.emptyDescription": {
    defaultMessage:
      "تُضاف المهام من داخل القضية، أو من هنا بالزر أعلاه. يتجمّع العمل المُسنَد في المكتب كله على هذه اللوحة.",
  },
};
