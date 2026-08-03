import 'package:flutter/widgets.dart';

import '../models/assistant_mode.dart';

/// Arabic and English copy.
///
/// Hand-rolled rather than generated from ARB files: this is a small, fixed
/// surface, and the wording is lifted from the web app's catalog
/// (web/lib/i18n/catalogs/ai.ts) so the two products describe the same
/// capabilities in the same words. Where that catalog says a mode is not built
/// yet, this must not say otherwise.
class Strings {
  const Strings(this.locale);

  final Locale locale;

  static const supported = [Locale('ar'), Locale('en')];

  static Strings of(BuildContext context) =>
      Strings(Localizations.localeOf(context));

  bool get isArabic => locale.languageCode == 'ar';

  TextDirection get direction =>
      isArabic ? TextDirection.rtl : TextDirection.ltr;

  String _(String en, String ar) => isArabic ? ar : en;

  String get appTitle => _('Legal Assistant', 'المساعد القانوني');

  String get heading => _('AI Assistant', 'المساعد الذكي');

  String get subheading => _(
    'Grounded Q&A over the statute corpus — ask in Arabic or English.',
    'إجابات قانونية موثّقة من مدوّنة القوانين المفهرسة — اسأل بالعربية أو الإنجليزية.',
  );

  String get newChat => _('New chat', 'محادثة جديدة');

  String get history => _('History', 'السجل');

  String get jurisdiction => _('Jurisdiction', 'الولاية القضائية');

  String get egypt => _('Egypt', 'مصر');

  String get saudiArabia => _('Saudi Arabia', 'السعودية');

  String get noCorpusYet => _('No corpus yet', 'لا توجد بيانات بعد');

  String get notBuiltYet => _('Not built yet', 'لم يُبنَ بعد');

  String get modeAvailabilityNote => _(
    'Question answering runs against the live corpus. The other modes are planned and not built yet.',
    'الإجابة عن الأسئلة تعمل فعليًا على قاعدة البيانات. أما الأوضاع الأخرى فمخطط لها ولم تُبنَ بعد.',
  );

  String mode(AssistantMode mode) => switch (mode) {
    AssistantMode.questionAnswering => _(
      'Question Answering',
      'الإجابة عن الأسئلة',
    ),
    AssistantMode.draftContract => _('Draft Contract', 'صياغة عقد'),
    AssistantMode.reviewContract => _('Review Contract', 'مراجعة عقد'),
    AssistantMode.translate => _('Translate', 'ترجمة'),
    AssistantMode.summarize => _('Summarize', 'تلخيص'),
    AssistantMode.caseAnalysis => _('Case Analysis', 'تحليل قضية'),
    AssistantMode.clauseComparison => _('Clause Comparison', 'مقارنة البنود'),
    AssistantMode.timelineExtraction => _(
      'Timeline Extraction',
      'استخلاص الجدول الزمني',
    ),
  };

  String get emptyTitle => _('Start a new conversation', 'ابدأ محادثة جديدة');

  String get emptyDescription => _(
    'Answers are composed only from statute articles retrieved from the corpus. Questions the corpus cannot support are refused rather than guessed at.',
    'الإجابات تُركَّب فقط من مواد قانونية مسترجَعة من قاعدة البيانات. الأسئلة التي لا تدعمها قاعدة البيانات تُرفض بدلًا من التخمين.',
  );

  String get composerPlaceholder => _(
    'Ask about the law in Arabic or English…',
    'اسأل عن القانون بالعربية أو الإنجليزية…',
  );

  String get send => _('Send', 'إرسال');

  String get stop => _('Stop', 'إيقاف');

  String get searching => _('Searching the corpus…', 'جارٍ البحث في القوانين…');

  String get writing => _('Writing the answer…', 'جارٍ كتابة الإجابة…');

  List<String> get suggestions => [
    isArabic
        ? 'ما هي مهلة الإخطار الواجب مراعاتها لإنهاء عقد عمل غير محدد المدة؟'
        : 'ما هي مهلة الإخطار الواجب مراعاتها لإنهاء عقد عمل غير محدد المدة؟',
    'كم يومًا تكون مدة الإجازة السنوية للعامل؟',
    isArabic
        ? 'هل يعترف قانون الشركات المصري بالشركة ذات الشخص الواحد؟'
        : "Does Egypt's Companies Law recognise single-person companies?",
  ];

  String get sourcesHeading => _('Sources', 'المصادر');

  String get citedInThisAnswer =>
      _('Cited in this answer', 'المصادر المستشهد بها في هذه الإجابة');

  String get knowledgeSourcesDescription => _(
    'Every answer is composed only from statute articles retrieved from the corpus, cited exactly as retrieved, and verified before being shown.',
    'كل إجابة مُركّبة فقط من مواد قانونية مسترجَعة من قاعدة البيانات، وموثّقة كما وردت، ويتم التحقق منها قبل عرضها.',
  );

  String get blockedLabel => _('Blocked', 'محجوبة');

  String get refusedLabel => _('Not in the corpus', 'غير متاح في القوانين');

  String get blockedExplanation => _(
    'This answer cited articles that are not in the corpus, so it could not be verified and was discarded.',
    'استشهدت هذه الإجابة بمواد غير موجودة في قاعدة البيانات، فتعذّر التحقق منها وتم استبعادها.',
  );

  String get refusedExplanation => _(
    'Nothing in the corpus answers this. The assistant refuses rather than guessing.',
    'لا يوجد في قاعدة البيانات ما يجيب عن هذا السؤال. يمتنع المساعد عن الإجابة بدلًا من التخمين.',
  );

  String get outOfCredits => _(
    'The model provider is out of credits. Browsing and search still work; answers need credits.',
    'نفدت أرصدة مزوّد النموذج. التصفح والبحث ما زالا يعملان، أما الإجابات فتحتاج إلى رصيد.',
  );

  String get retry => _('Retry', 'إعادة المحاولة');

  String get dismiss => _('Dismiss', 'إغلاق');

  String get noConversations => _(
    'No conversations yet. Ask a question to start one.',
    'لا توجد محادثات بعد. اطرح سؤالاً لبدء محادثة.',
  );

  String questionCount(int count) {
    if (!isArabic) return count == 1 ? '1 question' : '$count questions';
    return switch (count) {
      1 => 'سؤال واحد',
      2 => 'سؤالان',
      >= 3 && <= 10 => '$count أسئلة',
      _ => '$count سؤالاً',
    };
  }

  String get delete => _('Delete', 'حذف');

  String get disclaimerFooter => _(
    'Research assistance, not legal advice. Verify every citation against the official gazette before relying on it.',
    'مساعدة بحثية، وليست استشارة قانونية. تحقق من كل استشهاد في الجريدة الرسمية قبل الاعتماد عليه.',
  );

  String get language => _('العربية', 'English');

  // --- sign-in ------------------------------------------------------------

  String get continueWithApple =>
      _('Continue with Apple', 'المتابعة عبر Apple');

  String get continueWithGoogle =>
      _('Continue with Google', 'المتابعة عبر Google');

  String get signInFooter => _(
    'Your questions and answers are saved to your account.',
    'تُحفظ أسئلتك وإجاباتك في حسابك.',
  );

  String get signOut => _('Sign out', 'تسجيل الخروج');

  String get account => _('Account', 'الحساب');
}
