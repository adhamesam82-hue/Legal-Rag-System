@Tags(['live'])
library;

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legalos_mobile/auth/auth_gateway.dart';
import 'package:legalos_mobile/core/api_client.dart';
import 'package:legalos_mobile/core/config.dart';
import 'package:legalos_mobile/data/assistant_repository.dart';
import 'package:legalos_mobile/models/ask_event.dart';

/// Runs the real client against a real backend.
///
/// Skipped unless one is reachable, so it never breaks a normal `flutter
/// test`. Run it deliberately:
///
///   LEGALOS_DEV_AUTH=user_local uv run uvicorn legalrag.api:app --port 8077
///   flutter test test/live_backend_test.dart --dart-define=API_URL=http://localhost:8077
///
/// This is the only test that proves the app and the server agree about the
/// wire format; everything else fakes one side of it.
void main() {
  final baseUrl = const String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:8000',
  );

  late AssistantRepository repository;
  late Dio dio;
  var reachable = false;

  setUpAll(() async {
    // DevAuthGateway sends no token, matching a backend run with
    // LEGALOS_DEV_AUTH — the same way the app runs before Firebase exists.
    dio = buildApiClient(AppConfig(apiBaseUrl: baseUrl), DevAuthGateway());
    repository = AssistantRepository(dio);
    // Probing /api/health is not enough: a server started before this feature
    // existed answers it perfectly well and then 404s the streaming route. The
    // schema is the only thing that says whether this backend implements the
    // contract under test.
    try {
      final schema = await dio.get<Map<String, dynamic>>('/openapi.json');
      final paths = schema.data?['paths'] as Map<String, dynamic>?;
      reachable = paths?.containsKey('/api/ask/stream') ?? false;
    } catch (_) {
      reachable = false;
    }
  });

  test('an Arabic question streams a grounded, cited answer', () async {
    if (!reachable) {
      markTestSkipped('no backend at $baseUrl');
      return;
    }

    final events = await repository
        .ask(question: 'كم يومًا تكون مدة الإجازة السنوية للعامل؟', limit: 4)
        .toList();

    expect(events.first, isA<ArticlesRetrieved>());
    final retrieved = events.first as ArticlesRetrieved;
    expect(retrieved.articles, isNotEmpty);
    expect(retrieved.conversationId, greaterThan(0));

    final completed = events.last;
    expect(
      completed,
      isA<AnswerCompleted>(),
      reason: 'the stream must end with a verdict, not a delta',
    );

    final answer = completed as AnswerCompleted;
    expect(answer.blocked, isFalse);
    expect(answer.refused, isFalse);
    expect(answer.citations, isNotEmpty);
    expect(answer.text, contains('['));

    // Every citation resolves to an article that was actually retrieved --
    // the server guarantees this, and if it ever stops being true the app
    // would render dead citation chips.
    final retrievedCitations = retrieved.articles.map((a) => a.citation).toSet();
    for (final citation in answer.citations) {
      expect(retrievedCitations, contains(citation));
    }
  }, timeout: const Timeout(Duration(minutes: 3)));

  test('the turn is saved and reloads with its sources', () async {
    if (!reachable) {
      markTestSkipped('no backend at $baseUrl');
      return;
    }

    final events = await repository
        .ask(question: 'كم يومًا تكون مدة الإجازة السنوية للعامل؟', limit: 4)
        .toList();
    final conversationId = (events.first as ArticlesRetrieved).conversationId;

    final detail = await repository.conversation(conversationId);

    // The question is saved as soon as retrieval succeeds, whatever happens to
    // the answer afterwards. Asserted unconditionally because it is the
    // guarantee: a conversation never holds an answer with no question, and
    // back-to-back calls really do get rate-limited by the free NVIDIA tier,
    // which is exactly the "answer never arrived" case.
    expect(detail.messages.first.text, isNotEmpty);

    if (events.last case final AnswerCompleted completed) {
      expect(detail.messages, hasLength(2));
      expect(detail.messages.last.status, isNotNull);
      if (!completed.refused && !completed.blocked) {
        expect(detail.messages.last.citedArticles, isNotEmpty);
      }
    } else {
      expect(events.last, isA<AskFailed>());
      expect(
        detail.messages,
        hasLength(1),
        reason: 'a turn with no answer leaves the question and nothing else',
      );
    }

    // And it shows up in history either way.
    final listed = await repository.conversations();
    expect(listed.map((c) => c.id), contains(conversationId));

    await repository.deleteConversation(conversationId);
    expect(
      (await repository.conversations()).map((c) => c.id),
      isNot(contains(conversationId)),
    );
  }, timeout: const Timeout(Duration(minutes: 3)));
}
