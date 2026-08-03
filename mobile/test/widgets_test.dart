import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legalos_mobile/l10n/strings.dart';
import 'package:legalos_mobile/models/article.dart';
import 'package:legalos_mobile/models/assistant_mode.dart';
import 'package:legalos_mobile/models/chat_message.dart';
import 'package:legalos_mobile/ui/widgets/answer_text.dart';
import 'package:legalos_mobile/ui/widgets/message_bubble.dart';
import 'package:legalos_mobile/ui/widgets/mode_grid.dart';

const _article = Article(
  id: 1188,
  citation: '12/2003 Art. 47',
  instrumentNumber: '12',
  instrumentYear: 2003,
  instrumentTitle: 'قانون العمل',
  articleNumber: '47',
  text: 'تكون مدة الإجازة السنوية 21 يوما بأجر كامل',
);

Widget wrap(Widget child, {Locale locale = const Locale('en')}) => MaterialApp(
  locale: locale,
  supportedLocales: Strings.supported,
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

void main() {
  group('directionOf', () {
    test('Arabic text is right-to-left', () {
      expect(directionOf('ما هي مدة الإجازة؟'), TextDirection.rtl);
    });

    test('English text is left-to-right', () {
      expect(directionOf('How long is annual leave?'), TextDirection.ltr);
    });

    test('leading digits and punctuation do not decide direction', () {
      // "21 يوما" is Arabic; a naive first-character check would call it LTR
      // because it starts with a digit.
      expect(directionOf('21 يوما بأجر كامل'), TextDirection.rtl);
      expect(directionOf('"21 days"'), TextDirection.ltr);
    });

    test('empty text falls back to left-to-right', () {
      expect(directionOf(''), TextDirection.ltr);
    });
  });

  group('AnswerText', () {
    testWidgets('renders a citation as a tappable chip', (tester) async {
      Article? tapped;
      await tester.pumpWidget(
        wrap(
          AnswerText(
            text: 'Annual leave is 21 days [Law 12/2003, Art. 47].',
            articles: const [_article],
            onCitationTap: (article) => tapped = article,
          ),
        ),
      );

      expect(find.text('Art. 47 · 12/2003'), findsOneWidget);
      await tester.tap(find.text('Art. 47 · 12/2003'));
      expect(tapped?.id, 1188);
    });

    testWidgets('separates the trailing disclaimer from the answer', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const AnswerText(
            text: 'Leave is 21 days [Law 12/2003, Art. 47].\n\n'
                '_Research assistance, not legal advice._',
            articles: [_article],
          ),
        ),
      );

      final disclaimer = tester.widget<Text>(
        find.text('Research assistance, not legal advice.'),
      );
      expect(disclaimer.style?.fontStyle, FontStyle.italic);
    });

    testWidgets('lays an Arabic answer out RTL inside an English app', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const AnswerText(
            text: 'مدة الإجازة السنوية 21 يوما [Law 12/2003, Art. 47].',
            articles: [_article],
          ),
          locale: const Locale('en'),
        ),
      );

      // The answer's language follows the question, not the app's locale.
      final directionality = tester.widget<Directionality>(
        find
            .ancestor(
              of: find.byType(RichText).first,
              matching: find.byType(Directionality),
            )
            .first,
      );
      expect(directionality.textDirection, TextDirection.rtl);
    });
  });

  group('MessageBubble', () {
    testWidgets('a blocked answer says so and offers no sources', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const MessageBubble(
            message: ChatMessage(
              role: MessageRole.assistant,
              text: 'This answer was blocked because it cited articles that '
                  'were not retrieved from the corpus.',
              status: AnswerStatus.blocked,
              citations: ['99/1999 Art. 1'],
              blockedCitations: ['99/1999 Art. 1'],
              articles: [_article],
            ),
          ),
        ),
      );

      expect(find.text('Blocked'), findsOneWidget);
      // The blocked citation resolves to nothing retrieved, so there is no
      // source to offer -- and offering one would dignify a rejected answer.
      expect(find.textContaining('Sources'), findsNothing);
    });

    testWidgets('a refusal reads as "not in the corpus", not as an error', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const MessageBubble(
            message: ChatMessage(
              role: MessageRole.assistant,
              text: 'I could not find anything in the corpus.',
              status: AnswerStatus.refused,
            ),
          ),
        ),
      );

      expect(find.text('Not in the corpus'), findsOneWidget);
    });

    testWidgets('an answered turn offers its cited sources', (tester) async {
      await tester.pumpWidget(
        wrap(
          const MessageBubble(
            message: ChatMessage(
              role: MessageRole.assistant,
              text: '21 days [Law 12/2003, Art. 47].',
              status: AnswerStatus.answered,
              citations: ['12/2003 Art. 47'],
              articles: [_article],
            ),
          ),
        ),
      );

      expect(find.text('Sources · 1'), findsOneWidget);
    });
  });

  group('ModeGrid', () {
    testWidgets('only question answering is selectable', (tester) async {
      final selected = <AssistantMode>[];
      await tester.pumpWidget(
        wrap(
          ModeGrid(
            selected: AssistantMode.questionAnswering,
            onSelected: selected.add,
          ),
        ),
      );

      for (final mode in AssistantMode.all) {
        expect(find.text(_labelFor(mode)), findsOneWidget);
      }

      await tester.tap(find.text('Draft Contract'));
      await tester.pump();
      expect(selected, isEmpty, reason: 'an unbuilt mode must not be pickable');

      await tester.tap(find.text('Question Answering'));
      await tester.pump();
      expect(selected, [AssistantMode.questionAnswering]);
    });

    testWidgets('states that the other modes are not built', (tester) async {
      await tester.pumpWidget(
        wrap(const ModeGrid(selected: AssistantMode.questionAnswering)),
      );

      expect(
        find.textContaining('planned and not built yet'),
        findsOneWidget,
      );
    });

    testWidgets('Saudi Arabia is shown but not selectable', (tester) async {
      final picked = <Jurisdiction>[];
      await tester.pumpWidget(
        wrap(
          JurisdictionSelector(
            selected: Jurisdiction.egypt,
            onSelected: picked.add,
          ),
        ),
      );

      expect(find.text('Saudi Arabia'), findsOneWidget);
      await tester.tap(find.text('Saudi Arabia'));
      await tester.pump();
      // Nothing is ingested for SA, so every answer would be a refusal.
      expect(picked, isEmpty);
    });
  });

  group('Strings', () {
    test('Arabic pluralisation of the question count', () {
      const ar = Strings(Locale('ar'));
      expect(ar.questionCount(1), 'سؤال واحد');
      expect(ar.questionCount(2), 'سؤالان');
      expect(ar.questionCount(5), '5 أسئلة');
      expect(ar.questionCount(20), '20 سؤالاً');
    });

    test('English pluralisation', () {
      const en = Strings(Locale('en'));
      expect(en.questionCount(1), '1 question');
      expect(en.questionCount(3), '3 questions');
    });

    test('the availability note matches the web catalog wording', () {
      const en = Strings(Locale('en'));
      expect(
        en.modeAvailabilityNote,
        'Question answering runs against the live corpus. '
        'The other modes are planned and not built yet.',
      );
    });
  });
}

String _labelFor(AssistantMode mode) =>
    const Strings(Locale('en')).mode(mode);
