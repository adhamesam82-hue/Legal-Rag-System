import 'package:equatable/equatable.dart';

import 'article.dart';

enum MessageRole { user, assistant }

/// The backend's verdict on an assistant turn.
///
/// These are not cosmetic. A refusal and a blocked answer are both prose, and
/// the difference between them -- "the corpus does not cover this" versus "the
/// model cited something that does not exist" -- is the whole product. The
/// server sends the verdict rather than leaving the app to guess it from
/// wording.
enum AnswerStatus {
  answered,
  refused,
  blocked;

  static AnswerStatus? parse(String? value) => switch (value) {
    'answered' => AnswerStatus.answered,
    'refused' => AnswerStatus.refused,
    'blocked' => AnswerStatus.blocked,
    _ => null,
  };
}

class ChatMessage extends Equatable {
  const ChatMessage({
    required this.role,
    required this.text,
    this.id,
    this.status,
    this.citations = const [],
    this.blockedCitations = const [],
    this.articles = const [],
    this.isStreaming = false,
  });

  /// Server id. Null while a turn is still streaming and has not been saved.
  final int? id;
  final MessageRole role;
  final String text;
  final AnswerStatus? status;
  final List<String> citations;
  final List<String> blockedCitations;

  /// The articles the answer was allowed to draw on.
  final List<Article> articles;
  final bool isStreaming;

  ChatMessage copyWith({
    int? id,
    String? text,
    AnswerStatus? status,
    List<String>? citations,
    List<String>? blockedCitations,
    List<Article>? articles,
    bool? isStreaming,
  }) => ChatMessage(
    id: id ?? this.id,
    role: role,
    text: text ?? this.text,
    status: status ?? this.status,
    citations: citations ?? this.citations,
    blockedCitations: blockedCitations ?? this.blockedCitations,
    articles: articles ?? this.articles,
    isStreaming: isStreaming ?? this.isStreaming,
  );

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as int?,
    role: json['role'] == 'user' ? MessageRole.user : MessageRole.assistant,
    text: json['text'] as String? ?? '',
    status: AnswerStatus.parse(json['status'] as String?),
    citations:
        (json['citations'] as List?)?.map((e) => e as String).toList() ?? [],
    blockedCitations:
        (json['blocked_citations'] as List?)?.map((e) => e as String).toList() ??
        [],
    articles: (json['articles'] as List? ?? [])
        .map((e) => Article.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  /// The retrieved articles this answer actually cited, in citation order.
  ///
  /// Only these are offered as sources. Showing every retrieved article as a
  /// "source" would credit the answer with text it never used.
  List<Article> get citedArticles {
    final byCitation = {for (final a in articles) a.citation: a};
    return [
      for (final citation in citations)
        if (byCitation[citation] case final article?) article,
    ];
  }

  bool get isBlocked => status == AnswerStatus.blocked;
  bool get isRefused => status == AnswerStatus.refused;

  @override
  List<Object?> get props => [
    id,
    role,
    text,
    status,
    citations,
    articles,
    isStreaming,
  ];
}
