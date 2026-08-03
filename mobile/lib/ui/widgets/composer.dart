import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import 'answer_text.dart';

/// The question field.
///
/// Grows to five lines then scrolls: legal questions are long, and a
/// single-line field that hides the start of what you typed is the fastest way
/// to make someone give up on asking a precise question.
class Composer extends StatefulWidget {
  const Composer({
    super.key,
    required this.onSubmit,
    required this.isBusy,
    this.onStop,
    this.initialText,
  });

  final void Function(String question) onSubmit;
  final bool isBusy;
  final VoidCallback? onStop;
  final String? initialText;

  @override
  State<Composer> createState() => ComposerState();
}

class ComposerState extends State<Composer> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initialText,
  );
  final FocusNode _focusNode = FocusNode();
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _hasText = _controller.text.trim().isNotEmpty;
    _controller.addListener(() {
      final hasText = _controller.text.trim().isNotEmpty;
      if (hasText != _hasText) setState(() => _hasText = hasText);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  /// Fills the field from a suggestion without sending it, so the wording can
  /// still be edited before asking.
  void fill(String text) {
    _controller.text = text;
    _controller.selection = TextSelection.collapsed(offset: text.length);
    _focusNode.requestFocus();
  }

  void _submit() {
    final question = _controller.text.trim();
    if (question.isEmpty || widget.isBusy) return;
    widget.onSubmit(question);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.fromLTRB(
        12,
        10,
        12,
        10 + MediaQuery.viewPaddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: theme.dividerColor)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF19191B)
                    : const Color(0xFFF2F2F4),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: theme.dividerColor),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Directionality(
                // Follows what is being typed, so switching to Arabic
                // mid-thought moves the caret to the correct side.
                textDirection: _controller.text.isEmpty
                    ? Directionality.of(context)
                    : directionOf(_controller.text),
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  minLines: 1,
                  maxLines: 5,
                  textInputAction: TextInputAction.newline,
                  keyboardType: TextInputType.multiline,
                  style: theme.textTheme.bodyLarge,
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 13),
                    hintText: strings.composerPlaceholder,
                    hintStyle: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ),
                  onSubmitted: (_) => _submit(),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          _SendButton(
            isBusy: widget.isBusy,
            enabled: _hasText,
            onSend: _submit,
            onStop: widget.onStop,
            sendLabel: strings.send,
            stopLabel: strings.stop,
          ),
        ],
      ),
    );
  }
}

class _SendButton extends StatelessWidget {
  const _SendButton({
    required this.isBusy,
    required this.enabled,
    required this.onSend,
    required this.sendLabel,
    required this.stopLabel,
    this.onStop,
  });

  final bool isBusy;
  final bool enabled;
  final VoidCallback onSend;
  final VoidCallback? onStop;
  final String sendLabel;
  final String stopLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final active = isBusy || enabled;

    return Semantics(
      button: true,
      label: isBusy ? stopLabel : sendLabel,
      child: Material(
        color: active
            ? theme.colorScheme.primary
            : theme.colorScheme.primary.withValues(alpha: 0.25),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: isBusy ? onStop : (enabled ? onSend : null),
          child: SizedBox(
            // 44pt: the smallest target both platforms' guidelines accept.
            width: 44,
            height: 44,
            child: Icon(
              isBusy ? Icons.stop_rounded : Icons.arrow_upward_rounded,
              size: 21,
              color: theme.colorScheme.onPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
