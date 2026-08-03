import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../auth/auth_cubit.dart';
import '../blocs/chat_bloc.dart';
import '../l10n/strings.dart';
import '../models/article.dart';
import '../models/assistant_mode.dart';
import '../models/chat_message.dart';
import 'widgets/answer_text.dart';
import 'widgets/composer.dart';
import 'widgets/message_bubble.dart';
import 'widgets/mode_grid.dart';
import 'widgets/sources_sheet.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key, this.conversationId});

  final int? conversationId;

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _scrollController = ScrollController();
  final _composerKey = GlobalKey<ComposerState>();
  AssistantMode _mode = AssistantMode.questionAnswering;

  @override
  void initState() {
    super.initState();
    context.read<ChatBloc>().add(
      ChatOpened(conversationId: widget.conversationId),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// Opens history and, if a conversation is picked, loads it into this page.
  Future<void> _openHistory(BuildContext context) async {
    final bloc = context.read<ChatBloc>();
    final picked = await Navigator.of(context).pushNamed<Object?>('/history');
    if (!mounted) return; // the route may have been popped while we awaited
    if (picked is int) bloc.add(ChatOpened(conversationId: picked));
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    // After the frame the new text is laid out in; before it, maxScrollExtent
    // is still the old height and the view lands short.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = Strings.of(context);

    return BlocConsumer<ChatBloc, ChatState>(
      listenWhen: (previous, current) =>
          previous.messages.length != current.messages.length ||
          previous.messages.lastOrNull?.text != current.messages.lastOrNull?.text,
      listener: (context, _) => _scrollToBottom(),
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: Text(state.title ?? strings.heading),
            actions: [
              IconButton(
                tooltip: strings.history,
                icon: const Icon(Icons.history),
                onPressed: () => _openHistory(context),
              ),
              IconButton(
                tooltip: strings.newChat,
                icon: const Icon(Icons.add_comment_outlined),
                onPressed: state.isBusy
                    ? null
                    : () => context.read<ChatBloc>().add(const ChatOpened()),
              ),
              PopupMenuButton<void>(
                tooltip: strings.account,
                icon: const Icon(Icons.person_outline),
                itemBuilder: (context) => [
                  PopupMenuItem<void>(
                    onTap: () => context.read<AuthCubit>().signOut(),
                    child: Row(
                      children: [
                        const Icon(Icons.logout, size: 18),
                        const SizedBox(width: 10),
                        Text(strings.signOut),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              if (state.error != null)
                _ErrorBanner(
                  message: state.outOfCredits
                      ? strings.outOfCredits
                      : state.error!,
                  onDismiss: () =>
                      context.read<ChatBloc>().add(const ChatErrorDismissed()),
                ),
              Expanded(
                child: state.status == ChatStatus.loadingHistory
                    ? const Center(child: CircularProgressIndicator())
                    : state.isEmpty
                    ? _EmptyState(
                        mode: _mode,
                        jurisdiction: state.jurisdiction,
                        onModeSelected: (mode) => setState(() => _mode = mode),
                        onSuggestion: (text) =>
                            _composerKey.currentState?.fill(text),
                      )
                    : _Thread(
                        state: state,
                        controller: _scrollController,
                        onCitationTap: (article, message) =>
                            SourcesSheet.show(
                              context,
                              articles: message.citedArticles,
                              initial: article,
                            ),
                      ),
              ),
              if (state.status == ChatStatus.retrieving)
                _StatusLine(text: strings.searching),
              Composer(
                key: _composerKey,
                isBusy: state.isBusy,
                onSubmit: (question) => context.read<ChatBloc>().add(
                  ChatQuestionSubmitted(question),
                ),
                onStop: () => context.read<ChatBloc>().add(const ChatCancelled()),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Thread extends StatelessWidget {
  const _Thread({
    required this.state,
    required this.controller,
    required this.onCitationTap,
  });

  final ChatState state;
  final ScrollController controller;
  final void Function(Article article, ChatMessage message) onCitationTap;

  @override
  Widget build(BuildContext context) => ListView.builder(
    controller: controller,
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
    itemCount: state.messages.length,
    itemBuilder: (context, index) {
      final message = state.messages[index];
      return MessageBubble(
        message: message,
        onCitationTap: (article) => onCitationTap(article, message),
        onShowSources: () => SourcesSheet.show(
          context,
          articles: message.citedArticles,
        ),
      );
    },
  );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.mode,
    required this.jurisdiction,
    required this.onModeSelected,
    required this.onSuggestion,
  });

  final AssistantMode mode;
  final String jurisdiction;
  final void Function(AssistantMode) onModeSelected;
  final void Function(String) onSuggestion;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      children: [
        Text(strings.heading, style: theme.textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(strings.subheading, style: theme.textTheme.bodyMedium),
        const SizedBox(height: 24),

        JurisdictionSelector(
          selected: Jurisdiction.values.firstWhere(
            (j) => j.code == jurisdiction,
            orElse: () => Jurisdiction.egypt,
          ),
        ),
        const SizedBox(height: 24),

        ModeGrid(selected: mode, onSelected: onModeSelected),
        const SizedBox(height: 28),

        Divider(color: theme.dividerColor),
        const SizedBox(height: 20),

        Text(strings.emptyTitle, style: theme.textTheme.titleMedium),
        const SizedBox(height: 6),
        Text(strings.emptyDescription, style: theme.textTheme.bodySmall),
        const SizedBox(height: 18),

        for (final suggestion in strings.suggestions)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _SuggestionTile(
              text: suggestion,
              onTap: () => onSuggestion(suggestion),
            ),
          ),
      ],
    );
  }
}

class _SuggestionTile extends StatelessWidget {
  const _SuggestionTile({required this.text, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: theme.dividerColor),
          ),
          child: Row(
            children: [
              Expanded(
                child: BidiText(text, style: theme.textTheme.bodyMedium),
              ),
              const SizedBox(width: 10),
              Icon(
                Icons.north_east,
                size: 15,
                color: theme.textTheme.bodySmall?.color,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusLine extends StatelessWidget {
  const _StatusLine({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          SizedBox(
            width: 13,
            height: 13,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(width: 10),
          Text(text, style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onDismiss});

  final String message;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);

    return Container(
      width: double.infinity,
      color: theme.colorScheme.error.withValues(alpha: 0.1),
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.error_outline,
            size: 18,
            color: theme.colorScheme.error,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(message, style: theme.textTheme.bodySmall),
          ),
          TextButton(onPressed: onDismiss, child: Text(strings.dismiss)),
        ],
      ),
    );
  }
}
