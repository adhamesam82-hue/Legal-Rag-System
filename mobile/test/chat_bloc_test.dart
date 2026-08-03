import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legalos_mobile/blocs/chat_bloc.dart';
import 'package:legalos_mobile/data/assistant_repository.dart';
import 'package:legalos_mobile/models/article.dart';
import 'package:legalos_mobile/models/ask_event.dart';
import 'package:legalos_mobile/models/chat_message.dart';
import 'package:legalos_mobile/models/conversation.dart';

const _article = Article(
  id: 1188,
  citation: '12/2003 Art. 47',
  instrumentNumber: '12',
  instrumentYear: 2003,
  instrumentTitle: 'قانون العمل',
  articleNumber: '47',
  text: 'تكون مدة الإجازة السنوية 21 يوما بأجر كامل',
);

/// A repository that replays a fixed event sequence — no HTTP, no Dio mock.
/// Fakes over mocks: the thing under test is how the bloc reacts to the
/// server's event contract, and a hand-written fake states that contract
/// readably.
class FakeRepository implements AssistantRepository {
  FakeRepository(this.events, {this.detail});

  final List<AskEvent> events;
  final ConversationDetail? detail;
  int askCount = 0;
  int? lastConversationId;

  @override
  Stream<AskEvent> ask({
    required String question,
    String jurisdiction = 'EG',
    int? conversationId,
    int limit = 8,
    CancelToken? cancelToken,
  }) async* {
    askCount++;
    lastConversationId = conversationId;
    for (final event in events) {
      yield event;
    }
  }

  @override
  Future<ConversationDetail> conversation(int id) async {
    if (detail == null) throw StateError('no detail configured');
    return detail!;
  }

  @override
  Future<List<Conversation>> conversations({int limit = 50}) async => [];

  @override
  Future<void> deleteConversation(int id) async {}

  @override
  Future<Conversation> renameConversation(int id, String title) async =>
      throw UnimplementedError();

  @override
  Future<Article> article(int id) async => _article;
}

const _articlesEvent = ArticlesRetrieved(
  conversationId: 7,
  conversationTitle: 'How long is annual leave?',
  userMessageId: 11,
  strategy: 'hybrid',
  degraded: [],
  articles: [_article],
);

ChatMessage lastAssistant(ChatState state) =>
    state.messages.lastWhere((m) => m.role == MessageRole.assistant);

void main() {
  group('answering', () {
    blocTest<ChatBloc, ChatState>(
      'shows the question immediately and ends idle with the answer',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AnswerDelta('Annual leave is 21 days '),
          const AnswerCompleted(
            messageId: 12,
            text: 'Annual leave is 21 days [Law 12/2003, Art. 47].',
            citations: ['12/2003 Art. 47'],
            refused: false,
            blocked: false,
            blockedCitations: [],
          ),
        ]),
      ),
      act: (bloc) => bloc.add(const ChatQuestionSubmitted('How long?')),
      verify: (bloc) {
        expect(bloc.state.status, ChatStatus.idle);
        expect(bloc.state.messages, hasLength(2));
        expect(bloc.state.messages.first.text, 'How long?');
        expect(bloc.state.conversationId, 7);

        final answer = lastAssistant(bloc.state);
        expect(answer.status, AnswerStatus.answered);
        expect(answer.isStreaming, isFalse);
        expect(answer.id, 12);
        expect(answer.citedArticles.single.id, 1188);
      },
    );

    blocTest<ChatBloc, ChatState>(
      'deltas accumulate while streaming',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AnswerDelta('one '),
          const AnswerDelta('two '),
          const AnswerCompleted(
            messageId: 12,
            text: 'one two three [Law 12/2003, Art. 47].',
            citations: ['12/2003 Art. 47'],
            refused: false,
            blocked: false,
            blockedCitations: [],
          ),
        ]),
      ),
      act: (bloc) => bloc.add(const ChatQuestionSubmitted('q')),
      verify: (bloc) {
        // The final text is the server's, not 'one two ' + something.
        expect(lastAssistant(bloc.state).text, 'one two three [Law 12/2003, Art. 47].');
      },
    );

    blocTest<ChatBloc, ChatState>(
      'a second question reuses the conversation id from the first',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AnswerCompleted(
            messageId: 12,
            text: 'x [Law 12/2003, Art. 47].',
            citations: ['12/2003 Art. 47'],
            refused: false,
            blocked: false,
            blockedCitations: [],
          ),
        ]),
      ),
      act: (bloc) async {
        bloc.add(const ChatQuestionSubmitted('first'));
        await Future<void>.delayed(Duration.zero);
        bloc.add(const ChatQuestionSubmitted('second'));
      },
      wait: const Duration(milliseconds: 50),
      verify: (bloc) => expect(bloc.state.conversationId, 7),
    );
  });

  group('the completed text replaces the streamed preview', () {
    blocTest<ChatBloc, ChatState>(
      'a blocked answer leaves none of the streamed text on screen',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          // Released by the server before the invented citation arrived.
          const AnswerDelta('Annual leave is 21 days [Law 12/2003, Art. 47]. '),
          const AnswerDelta('Notice is three months '),
          const AnswerCompleted(
            messageId: 13,
            text: 'This answer was blocked because it cited articles that were '
                'not retrieved from the corpus: 99/1999 Art. 1',
            citations: ['12/2003 Art. 47', '99/1999 Art. 1'],
            refused: false,
            blocked: true,
            blockedCitations: ['99/1999 Art. 1'],
          ),
        ]),
      ),
      act: (bloc) => bloc.add(const ChatQuestionSubmitted('q')),
      verify: (bloc) {
        final answer = lastAssistant(bloc.state);
        expect(answer.isBlocked, isTrue);
        expect(answer.blockedCitations, ['99/1999 Art. 1']);

        // The whole point: the preview is gone, not appended to.
        expect(answer.text, isNot(contains('Annual leave is 21 days')));
        expect(answer.text, isNot(contains('Notice is three months')));
      },
    );

    blocTest<ChatBloc, ChatState>(
      'a refusal is marked as such, not shown as an answer',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AnswerCompleted(
            messageId: 14,
            text: 'I could not find anything in the corpus that answers this.',
            citations: [],
            refused: true,
            blocked: false,
            blockedCitations: [],
          ),
        ]),
      ),
      act: (bloc) => bloc.add(const ChatQuestionSubmitted('what is Saudi VAT?')),
      verify: (bloc) {
        final answer = lastAssistant(bloc.state);
        expect(answer.isRefused, isTrue);
        expect(answer.citedArticles, isEmpty);
      },
    );
  });

  group('failure', () {
    blocTest<ChatBloc, ChatState>(
      'a failed turn drops its half-written answer and keeps the question',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AnswerDelta('Annual leave is '),
          const AskFailed(status: 502, detail: 'Model provider error'),
        ]),
      ),
      act: (bloc) => bloc.add(const ChatQuestionSubmitted('How long?')),
      verify: (bloc) {
        expect(bloc.state.status, ChatStatus.failed);
        expect(bloc.state.error, 'Model provider error');
        // Unverified text never survives a turn that got no verdict.
        expect(bloc.state.messages.map((m) => m.role), [MessageRole.user]);
        expect(bloc.state.messages.single.text, 'How long?');
      },
    );

    blocTest<ChatBloc, ChatState>(
      'running out of credits is flagged distinctly',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AskFailed(status: 402, detail: 'insufficient credits'),
        ]),
      ),
      act: (bloc) => bloc.add(const ChatQuestionSubmitted('q')),
      verify: (bloc) => expect(bloc.state.outOfCredits, isTrue),
    );

    blocTest<ChatBloc, ChatState>(
      'a stream that ends with no terminal event does not spin forever',
      build: () => ChatBloc(
        FakeRepository([_articlesEvent, const AnswerDelta('half an answer')]),
      ),
      act: (bloc) => bloc.add(const ChatQuestionSubmitted('q')),
      verify: (bloc) {
        expect(bloc.state.isBusy, isFalse);
        expect(bloc.state.status, ChatStatus.failed);
      },
    );

    blocTest<ChatBloc, ChatState>(
      'dismissing an error keeps the turns that succeeded',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AskFailed(status: 500, detail: 'boom'),
        ]),
      ),
      act: (bloc) async {
        bloc.add(const ChatQuestionSubmitted('q'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        bloc.add(const ChatErrorDismissed());
      },
      wait: const Duration(milliseconds: 50),
      verify: (bloc) {
        expect(bloc.state.error, isNull);
        expect(bloc.state.messages, hasLength(1));
      },
    );
  });

  group('history', () {
    blocTest<ChatBloc, ChatState>(
      'opening a saved conversation loads its turns and sources',
      build: () => ChatBloc(
        FakeRepository(
          const [],
          detail: ConversationDetail(
            conversation: Conversation(
              id: 7,
              title: 'Annual leave',
              jurisdiction: 'EG',
              updatedAt: _epoch,
              messageCount: 1,
            ),
            messages: [
              ChatMessage(role: MessageRole.user, text: 'How long?'),
              ChatMessage(
                role: MessageRole.assistant,
                text: '21 days [Law 12/2003, Art. 47].',
                status: AnswerStatus.answered,
                citations: ['12/2003 Art. 47'],
                articles: [_article],
              ),
            ],
          ),
        ),
      ),
      act: (bloc) => bloc.add(const ChatOpened(conversationId: 7)),
      verify: (bloc) {
        expect(bloc.state.status, ChatStatus.idle);
        expect(bloc.state.title, 'Annual leave');
        expect(bloc.state.messages, hasLength(2));
        expect(lastAssistant(bloc.state).citedArticles.single.id, 1188);
      },
    );

    blocTest<ChatBloc, ChatState>(
      'starting a new chat clears the previous thread',
      build: () => ChatBloc(
        FakeRepository([
          _articlesEvent,
          const AnswerCompleted(
            messageId: 12,
            text: 'x [Law 12/2003, Art. 47].',
            citations: ['12/2003 Art. 47'],
            refused: false,
            blocked: false,
            blockedCitations: [],
          ),
        ]),
      ),
      act: (bloc) async {
        bloc.add(const ChatQuestionSubmitted('q'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        bloc.add(const ChatOpened());
      },
      wait: const Duration(milliseconds: 50),
      verify: (bloc) {
        expect(bloc.state.messages, isEmpty);
        expect(bloc.state.conversationId, isNull);
      },
    );
  });

  group('citedArticles', () {
    test('lists only articles the answer actually cited', () {
      const message = ChatMessage(
        role: MessageRole.assistant,
        text: 'x',
        citations: ['12/2003 Art. 47'],
        articles: [
          _article,
          Article(
            id: 999,
            citation: '12/2003 Art. 80',
            instrumentNumber: '12',
            instrumentYear: 2003,
            instrumentTitle: 'قانون العمل',
            articleNumber: '80',
            text: 'retrieved but never cited',
          ),
        ],
      );

      // Retrieved-but-uncited articles are not sources for this answer.
      expect(message.citedArticles.map((a) => a.id), [1188]);
    });
  });
}

final _epoch = DateTime.fromMillisecondsSinceEpoch(0);
