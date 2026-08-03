import 'package:bloc/bloc.dart';
import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';

import '../data/assistant_repository.dart';
import '../models/article.dart';
import '../models/ask_event.dart';
import '../models/chat_message.dart';
import '../models/conversation.dart';

sealed class ChatEvent extends Equatable {
  const ChatEvent();

  @override
  List<Object?> get props => [];
}

/// Open a saved conversation. Omit the id for a fresh one.
final class ChatOpened extends ChatEvent {
  const ChatOpened({this.conversationId});

  final int? conversationId;

  @override
  List<Object?> get props => [conversationId];
}

final class ChatQuestionSubmitted extends ChatEvent {
  const ChatQuestionSubmitted(this.question);

  final String question;

  @override
  List<Object?> get props => [question];
}

/// Abandon an answer in progress. The question stays in the thread -- the
/// server has already saved it -- so a retry appends rather than duplicating.
final class ChatCancelled extends ChatEvent {
  const ChatCancelled();
}

/// Clear a failure notice. Does not touch the thread — the turns that already
/// succeeded are unaffected by the one that did not.
final class ChatErrorDismissed extends ChatEvent {
  const ChatErrorDismissed();
}

final class ChatJurisdictionChanged extends ChatEvent {
  const ChatJurisdictionChanged(this.code);

  final String code;

  @override
  List<Object?> get props => [code];
}

enum ChatStatus {
  idle,
  loadingHistory,

  /// Searching the corpus. No answer text exists yet, by design.
  retrieving,

  /// The model is writing and text is being released.
  streaming,
  failed,
}

class ChatState extends Equatable {
  const ChatState({
    this.status = ChatStatus.idle,
    this.messages = const [],
    this.conversationId,
    this.title,
    this.jurisdiction = 'EG',
    this.error,
    this.outOfCredits = false,
  });

  final ChatStatus status;
  final List<ChatMessage> messages;
  final int? conversationId;
  final String? title;
  final String jurisdiction;
  final String? error;

  /// The provider rejected the request for lack of credits. Worth its own flag
  /// because browsing and search still work when this is true, so the UI can
  /// say so instead of implying the whole app is down.
  final bool outOfCredits;

  bool get isBusy =>
      status == ChatStatus.retrieving || status == ChatStatus.streaming;

  bool get isEmpty => messages.isEmpty;

  /// Every article cited anywhere in this conversation, deduplicated.
  List<Article> get citedSources {
    final seen = <String, Article>{};
    for (final message in messages) {
      for (final article in message.citedArticles) {
        seen[article.citation] = article;
      }
    }
    return seen.values.toList();
  }

  ChatState copyWith({
    ChatStatus? status,
    List<ChatMessage>? messages,
    int? conversationId,
    String? title,
    String? jurisdiction,
    String? error,
    bool? outOfCredits,
    bool clearError = false,
  }) => ChatState(
    status: status ?? this.status,
    messages: messages ?? this.messages,
    conversationId: conversationId ?? this.conversationId,
    title: title ?? this.title,
    jurisdiction: jurisdiction ?? this.jurisdiction,
    error: clearError ? null : (error ?? this.error),
    outOfCredits: clearError ? false : (outOfCredits ?? this.outOfCredits),
  );

  @override
  List<Object?> get props => [
    status,
    messages,
    conversationId,
    title,
    jurisdiction,
    error,
    outOfCredits,
  ];
}

class ChatBloc extends Bloc<ChatEvent, ChatState> {
  ChatBloc(this._repository) : super(const ChatState()) {
    on<ChatOpened>(_onOpened);
    on<ChatQuestionSubmitted>(_onQuestionSubmitted);
    on<ChatCancelled>(_onCancelled);
    on<ChatErrorDismissed>(
      (event, emit) => emit(
        state.copyWith(
          status: state.isBusy ? state.status : ChatStatus.idle,
          clearError: true,
        ),
      ),
    );
    on<ChatJurisdictionChanged>(
      (event, emit) => emit(state.copyWith(jurisdiction: event.code)),
    );
  }

  final AssistantRepository _repository;
  CancelToken? _inFlight;

  Future<void> _onOpened(ChatOpened event, Emitter<ChatState> emit) async {
    if (event.conversationId == null) {
      emit(const ChatState());
      return;
    }

    emit(state.copyWith(status: ChatStatus.loadingHistory, clearError: true));
    try {
      final detail = await _repository.conversation(event.conversationId!);
      emit(
        ChatState(
          status: ChatStatus.idle,
          messages: detail.messages,
          conversationId: detail.conversation.id,
          title: detail.conversation.title,
          jurisdiction: detail.conversation.jurisdiction,
        ),
      );
    } catch (error) {
      emit(
        state.copyWith(status: ChatStatus.failed, error: _readable(error)),
      );
    }
  }

  Future<void> _onQuestionSubmitted(
    ChatQuestionSubmitted event,
    Emitter<ChatState> emit,
  ) async {
    final question = event.question.trim();
    if (question.isEmpty || state.isBusy) return;

    // The user's turn and an empty assistant turn go up together, so the
    // thread never shows a question with nothing beneath it.
    emit(
      state.copyWith(
        status: ChatStatus.retrieving,
        clearError: true,
        messages: [
          ...state.messages,
          ChatMessage(role: MessageRole.user, text: question),
          const ChatMessage(
            role: MessageRole.assistant,
            text: '',
            isStreaming: true,
          ),
        ],
      ),
    );

    final cancelToken = CancelToken();
    _inFlight = cancelToken;

    await emit.forEach<AskEvent>(
      _repository.ask(
        question: question,
        jurisdiction: state.jurisdiction,
        conversationId: state.conversationId,
        cancelToken: cancelToken,
      ),
      onData: _apply,
      onError: (error, _) =>
          _withFailure(state, AskFailed(status: 500, detail: _readable(error))),
    );

    _inFlight = null;
    if (state.isBusy) {
      // The stream ended without a terminal event -- the connection dropped
      // mid-answer. Leaving the bubble spinning forever is the one outcome
      // that gives the user nothing to act on.
      emit(
        _withFailure(
          state,
          const AskFailed(status: 0, detail: 'The answer stopped part-way.'),
        ),
      );
    }
  }

  void _onCancelled(ChatCancelled event, Emitter<ChatState> emit) {
    _inFlight?.cancel('cancelled by user');
    _inFlight = null;
    if (!state.isBusy) return;
    emit(
      state.copyWith(
        status: ChatStatus.idle,
        messages: _withoutTrailingPlaceholder(state.messages),
      ),
    );
  }

  ChatState _apply(AskEvent event) => switch (event) {
    ArticlesRetrieved() => state.copyWith(
      status: ChatStatus.streaming,
      conversationId: event.conversationId,
      title: state.title ?? event.conversationTitle,
      messages: _replaceLast(
        state.messages,
        (last) => last.copyWith(articles: event.articles),
      ),
    ),

    // Deltas paint a preview. They are appended because that is what makes
    // the answer appear to be written; `done` below throws all of it away.
    AnswerDelta() => state.copyWith(
      status: ChatStatus.streaming,
      messages: _replaceLast(
        state.messages,
        (last) => last.copyWith(text: last.text + event.text),
      ),
    ),

    // The server's text is authoritative and REPLACES everything the deltas
    // painted. This is not a nicety: an answer can be blocked after part of it
    // has been released, and appending here would leave the rejected text on
    // screen underneath a blocked notice.
    AnswerCompleted() => state.copyWith(
      status: ChatStatus.idle,
      messages: _replaceLast(
        state.messages,
        (last) => last.copyWith(
          id: event.messageId,
          text: event.text,
          citations: event.citations,
          blockedCitations: event.blockedCitations,
          status: event.blocked
              ? AnswerStatus.blocked
              : event.refused
              ? AnswerStatus.refused
              : AnswerStatus.answered,
          isStreaming: false,
        ),
      ),
    ),

    AskFailed() => _withFailure(state, event),
  };

  /// A failed turn drops its half-written answer bubble entirely.
  ///
  /// Whatever text arrived was a preview of an answer that never got a
  /// verdict, and unverified text left on screen is exactly what the backend's
  /// gating exists to prevent.
  ChatState _withFailure(ChatState current, AskFailed failure) =>
      current.copyWith(
        status: ChatStatus.failed,
        error: failure.detail,
        outOfCredits: failure.isOutOfCredits,
        messages: _withoutTrailingPlaceholder(current.messages),
      );

  static List<ChatMessage> _withoutTrailingPlaceholder(
    List<ChatMessage> messages,
  ) {
    if (messages.isEmpty) return messages;
    final last = messages.last;
    if (last.role != MessageRole.assistant || !last.isStreaming) return messages;
    return messages.sublist(0, messages.length - 1);
  }

  static List<ChatMessage> _replaceLast(
    List<ChatMessage> messages,
    ChatMessage Function(ChatMessage) update,
  ) {
    if (messages.isEmpty) return messages;
    return [...messages.sublist(0, messages.length - 1), update(messages.last)];
  }

  static String _readable(Object error) {
    if (error is DioException) {
      final detail = error.response?.data;
      if (detail is Map && detail['detail'] is String) {
        return detail['detail'] as String;
      }
      return error.message ?? error.toString();
    }
    return error.toString();
  }

  @override
  Future<void> close() {
    _inFlight?.cancel('bloc closed');
    return super.close();
  }
}

/// The conversation list. A cubit rather than a bloc: load, delete, reload —
/// no event vocabulary worth naming.
class ConversationsCubit extends Cubit<ConversationsState> {
  ConversationsCubit(this._repository) : super(const ConversationsState());

  final AssistantRepository _repository;

  Future<void> load() async {
    emit(state.copyWith(loading: true, clearError: true));
    try {
      emit(
        ConversationsState(loading: false, conversations: await _repository.conversations()),
      );
    } catch (error) {
      emit(state.copyWith(loading: false, error: error.toString()));
    }
  }

  Future<void> remove(int id) async {
    // Removed locally first: the list is the user's own history and the
    // round-trip is pure latency on an action that cannot partially succeed.
    emit(
      state.copyWith(
        conversations: state.conversations.where((c) => c.id != id).toList(),
      ),
    );
    try {
      await _repository.deleteConversation(id);
    } catch (_) {
      await load();
    }
  }
}

class ConversationsState extends Equatable {
  const ConversationsState({
    this.loading = false,
    this.conversations = const [],
    this.error,
  });

  final bool loading;
  final List<Conversation> conversations;
  final String? error;

  ConversationsState copyWith({
    bool? loading,
    List<Conversation>? conversations,
    String? error,
    bool clearError = false,
  }) => ConversationsState(
    loading: loading ?? this.loading,
    conversations: conversations ?? this.conversations,
    error: clearError ? null : (error ?? this.error),
  );

  @override
  List<Object?> get props => [loading, conversations, error];
}
