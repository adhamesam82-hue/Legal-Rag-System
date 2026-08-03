import 'package:equatable/equatable.dart';

import 'chat_message.dart';

class Conversation extends Equatable {
  const Conversation({
    required this.id,
    required this.title,
    required this.jurisdiction,
    required this.updatedAt,
    this.messageCount = 0,
  });

  final int id;
  final String title;
  final String jurisdiction;
  final DateTime updatedAt;

  /// Questions asked, not turns — a question and its answer read as one item.
  final int messageCount;

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
    id: json['id'] as int,
    title: json['title'] as String,
    jurisdiction: json['jurisdiction'] as String? ?? 'EG',
    updatedAt:
        DateTime.tryParse(json['updated_at'] as String? ?? '')?.toLocal() ??
        DateTime.fromMillisecondsSinceEpoch(0),
    messageCount: json['message_count'] as int? ?? 0,
  );

  @override
  List<Object?> get props => [id, title, updatedAt, messageCount];
}

class ConversationDetail extends Equatable {
  const ConversationDetail({required this.conversation, required this.messages});

  final Conversation conversation;
  final List<ChatMessage> messages;

  factory ConversationDetail.fromJson(Map<String, dynamic> json) =>
      ConversationDetail(
        conversation: Conversation.fromJson(
          json['conversation'] as Map<String, dynamic>,
        ),
        messages: (json['messages'] as List? ?? [])
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  @override
  List<Object?> get props => [conversation, messages];
}
