/// The assistant's modes.
///
/// Exactly one is built. The rest are shown because they are the product's
/// stated roadmap, and are marked unavailable and left non-selectable rather
/// than wired to something that fakes an answer -- the web app carries the
/// same list with the same note ("Question answering runs against the live
/// corpus. The other modes are planned and not built yet"), and the two must
/// not drift into disagreeing about what exists.
enum AssistantMode {
  questionAnswering(available: true),
  draftContract(available: false),
  reviewContract(available: false),
  translate(available: false),
  summarize(available: false),
  caseAnalysis(available: false),
  clauseComparison(available: false),
  timelineExtraction(available: false);

  const AssistantMode({required this.available});

  final bool available;

  static const List<AssistantMode> all = AssistantMode.values;
}

/// A jurisdiction the corpus can be filtered to.
///
/// Saudi Arabia is a valid filter in the API but nothing is ingested for it, so
/// selecting it would produce a refusal on every question. It is listed as
/// unavailable instead of silently returning nothing.
enum Jurisdiction {
  egypt('EG', available: true),
  saudiArabia('SA', available: false);

  const Jurisdiction(this.code, {required this.available});

  final String code;
  final bool available;
}
