import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/chat_bloc.dart';
import '../l10n/strings.dart';
import '../models/conversation.dart';
import 'widgets/answer_text.dart';

/// Saved conversations, most recently active first.
class ConversationsPage extends StatefulWidget {
  const ConversationsPage({super.key});

  @override
  State<ConversationsPage> createState() => _ConversationsPageState();
}

class _ConversationsPageState extends State<ConversationsPage> {
  @override
  void initState() {
    super.initState();
    context.read<ConversationsCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    final strings = Strings.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(strings.history)),
      body: BlocBuilder<ConversationsCubit, ConversationsState>(
        builder: (context, state) {
          if (state.loading && state.conversations.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.error != null && state.conversations.isEmpty) {
            return _Centered(text: state.error!);
          }
          if (state.conversations.isEmpty) {
            return _Centered(text: strings.noConversations);
          }

          return RefreshIndicator(
            onRefresh: () => context.read<ConversationsCubit>().load(),
            child: ListView.separated(
              itemCount: state.conversations.length,
              separatorBuilder: (context, _) =>
                  Divider(height: 1, color: Theme.of(context).dividerColor),
              itemBuilder: (context, index) => _ConversationTile(
                conversation: state.conversations[index],
                onOpen: () => Navigator.of(context).pop(
                  state.conversations[index].id,
                ),
                onDelete: () => context.read<ConversationsCubit>().remove(
                  state.conversations[index].id,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({
    required this.conversation,
    required this.onOpen,
    required this.onDelete,
  });

  final Conversation conversation;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);

    return Dismissible(
      key: ValueKey(conversation.id),
      direction: DismissDirection.endToStart,
      background: Container(
        color: theme.colorScheme.error.withValues(alpha: 0.15),
        alignment: AlignmentDirectional.centerEnd,
        padding: const EdgeInsetsDirectional.only(end: 20),
        child: Icon(Icons.delete_outline, color: theme.colorScheme.error),
      ),
      onDismissed: (_) => onDelete(),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 6,
        ),
        title: BidiText(
          conversation.title,
          style: theme.textTheme.bodyLarge,
          maxLines: 2,
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            '${strings.questionCount(conversation.messageCount)} · '
            '${_relativeDate(conversation.updatedAt, strings)}',
            style: theme.textTheme.bodySmall,
          ),
        ),
        onTap: onOpen,
      ),
    );
  }

  static String _relativeDate(DateTime when, Strings strings) {
    final difference = DateTime.now().difference(when);
    if (difference.inMinutes < 1) return strings.isArabic ? 'الآن' : 'just now';
    if (difference.inHours < 1) {
      final minutes = difference.inMinutes;
      return strings.isArabic ? 'منذ $minutes د' : '${minutes}m ago';
    }
    if (difference.inDays < 1) {
      final hours = difference.inHours;
      return strings.isArabic ? 'منذ $hours س' : '${hours}h ago';
    }
    if (difference.inDays < 7) {
      final days = difference.inDays;
      return strings.isArabic ? 'منذ $days ي' : '${days}d ago';
    }
    return '${when.year}-${when.month.toString().padLeft(2, '0')}-'
        '${when.day.toString().padLeft(2, '0')}';
  }
}

class _Centered extends StatelessWidget {
  const _Centered({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall,
      ),
    ),
  );
}
