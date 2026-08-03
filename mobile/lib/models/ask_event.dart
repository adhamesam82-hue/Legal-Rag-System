import 'package:equatable/equatable.dart';

import 'article.dart';

/// One event from `POST /api/ask/stream`.
///
/// The server's contract, which this app is obliged to honour:
///   `articles` first, then zero or more `delta`, then exactly one of
///   `done` or `error`.
///
/// [AnswerDelta] text is a *preview*. [AnswerCompleted.text] is authoritative
/// and replaces everything the deltas painted -- it is not appended to. That
/// is what makes a blocked answer disappear instead of staying on screen: the
/// backend gates tokens so nothing unverified is ever sent, but an answer can
/// still be blocked after some of it has been released, and the only correct
/// response is to swap in the completed text.
sealed class AskEvent extends Equatable {
  const AskEvent();

  @override
  List<Object?> get props => [];
}

/// The articles retrieved for this question, and the ids the turn was saved under.
final class ArticlesRetrieved extends AskEvent {
  const ArticlesRetrieved({
    required this.conversationId,
    required this.conversationTitle,
    required this.userMessageId,
    required this.strategy,
    required this.degraded,
    required this.articles,
  });

  final int conversationId;
  final String conversationTitle;
  final int userMessageId;
  final String strategy;

  /// Stages that fell back rather than failing (expansion, reranking).
  final List<String> degraded;
  final List<Article> articles;

  factory ArticlesRetrieved.fromJson(Map<String, dynamic> json) =>
      ArticlesRetrieved(
        conversationId: json['conversation_id'] as int,
        conversationTitle: json['conversation_title'] as String? ?? '',
        userMessageId: json['user_message_id'] as int,
        strategy: json['strategy'] as String? ?? '',
        degraded:
            (json['degraded'] as List?)?.map((e) => e as String).toList() ?? [],
        articles: (json['articles'] as List? ?? [])
            .map((e) => Article.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  @override
  List<Object?> get props => [conversationId, userMessageId, articles];
}

/// A run of answer text that has cleared the backend's citation enforcement.
final class AnswerDelta extends AskEvent {
  const AnswerDelta(this.text);

  final String text;

  @override
  List<Object?> get props => [text];
}

/// Terminal success. [text] replaces every delta rendered so far.
final class AnswerCompleted extends AskEvent {
  const AnswerCompleted({
    required this.messageId,
    required this.text,
    required this.citations,
    required this.refused,
    required this.blocked,
    required this.blockedCitations,
  });

  final int messageId;
  final String text;
  final List<String> citations;
  final bool refused;
  final bool blocked;
  final List<String> blockedCitations;

  factory AnswerCompleted.fromJson(Map<String, dynamic> json) =>
      AnswerCompleted(
        messageId: json['message_id'] as int? ?? 0,
        text: json['text'] as String? ?? '',
        citations:
            (json['citations'] as List?)?.map((e) => e as String).toList() ?? [],
        refused: json['refused'] as bool? ?? false,
        blocked: json['blocked'] as bool? ?? false,
        blockedCitations:
            (json['blocked_citations'] as List?)
                ?.map((e) => e as String)
                .toList() ??
            [],
      );

  @override
  List<Object?> get props => [messageId, text, blocked, refused];
}

/// Terminal failure. [status] mirrors the HTTP status the same failure would
/// have carried had the response not already been open — 402 is the one worth
/// wording differently, since it means the provider is out of credits rather
/// than anything the user did.
final class AskFailed extends AskEvent {
  const AskFailed({required this.status, required this.detail});

  final int status;
  final String detail;

  factory AskFailed.fromJson(Map<String, dynamic> json) => AskFailed(
    status: json['status'] as int? ?? 500,
    detail: json['detail'] as String? ?? 'Unknown error',
  );

  bool get isOutOfCredits => status == 402;

  @override
  List<Object?> get props => [status, detail];
}
