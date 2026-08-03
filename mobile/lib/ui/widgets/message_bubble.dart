import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../models/article.dart';
import '../../models/chat_message.dart';
import 'answer_text.dart';

/// One turn in the thread.
///
/// The user's question is a bubble; the assistant's answer is not. That is the
/// ChatGPT/haqq shape and it is the right one here for a specific reason -- an
/// answer is long, dense, cited legal text, and boxing it makes it read as a
/// chat message rather than as a research result.
class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.message,
    this.onCitationTap,
    this.onShowSources,
  });

  final ChatMessage message;
  final void Function(Article article)? onCitationTap;
  final VoidCallback? onShowSources;

  @override
  Widget build(BuildContext context) => message.role == MessageRole.user
      ? _QuestionBubble(text: message.text)
      : _Answer(
          message: message,
          onCitationTap: onCitationTap,
          onShowSources: onShowSources,
        );
}

class _QuestionBubble extends StatelessWidget {
  const _QuestionBubble({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Align(
        // Aligned to the end of the *reading* direction, so the question sits
        // on the left in Arabic and the right in English without a branch.
        alignment: AlignmentDirectional.centerEnd,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.82,
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1F1F21) : const Color(0xFFEFEFF1),
              borderRadius: const BorderRadius.all(Radius.circular(18)),
            ),
            child: BidiText(text, style: theme.textTheme.bodyLarge),
          ),
        ),
      ),
    );
  }
}

class _Answer extends StatelessWidget {
  const _Answer({
    required this.message,
    this.onCitationTap,
    this.onShowSources,
  });

  final ChatMessage message;
  final void Function(Article article)? onCitationTap;
  final VoidCallback? onShowSources;

  @override
  Widget build(BuildContext context) {
    final strings = Strings.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (message.isBlocked)
            _VerdictBanner(
              icon: Icons.gpp_maybe_outlined,
              label: strings.blockedLabel,
              explanation: strings.blockedExplanation,
              tone: _Tone.error,
            )
          else if (message.isRefused)
            _VerdictBanner(
              icon: Icons.search_off_outlined,
              label: strings.refusedLabel,
              explanation: strings.refusedExplanation,
              tone: _Tone.neutral,
            ),

          if (message.text.isNotEmpty) ...[
            if (message.isBlocked || message.isRefused)
              const SizedBox(height: 12),
            AnswerText(
              text: message.text,
              articles: message.articles,
              onCitationTap: onCitationTap,
            ),
          ],

          if (message.isStreaming) ...[
            if (message.text.isNotEmpty) const SizedBox(height: 8),
            const _StreamingCursor(),
          ],

          if (!message.isStreaming && message.citedArticles.isNotEmpty) ...[
            const SizedBox(height: 14),
            _SourcesButton(
              count: message.citedArticles.length,
              label: strings.sourcesHeading,
              onTap: onShowSources,
            ),
          ],
        ],
      ),
    );
  }
}

enum _Tone { error, neutral }

class _VerdictBanner extends StatelessWidget {
  const _VerdictBanner({
    required this.icon,
    required this.label,
    required this.explanation,
    required this.tone,
  });

  final IconData icon;
  final String label;
  final String explanation;
  final _Tone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = tone == _Tone.error
        ? theme.colorScheme.error
        : theme.textTheme.bodySmall?.color ?? theme.colorScheme.onSurface;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelLarge?.copyWith(color: color),
                ),
                const SizedBox(height: 3),
                Text(explanation, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SourcesButton extends StatelessWidget {
  const _SourcesButton({
    required this.count,
    required this.label,
    this.onTap,
  });

  final int count;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.menu_book_outlined,
              size: 16,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(width: 7),
            Text(
              '$label · $count',
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A blinking block, the conventional "still writing" signal.
class _StreamingCursor extends StatefulWidget {
  const _StreamingCursor();

  @override
  State<_StreamingCursor> createState() => _StreamingCursorState();
}

class _StreamingCursorState extends State<_StreamingCursor>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: _controller.drive(Tween(begin: 0.25, end: 1)),
    child: Container(
      width: 9,
      height: 16,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(2),
      ),
    ),
  );
}
