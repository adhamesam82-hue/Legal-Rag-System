import 'package:flutter/material.dart';

import '../../models/article.dart';

/// Matches the citation form the answering prompt mandates, e.g.
/// `[Law 12/2003, Art. 80]`. Kept deliberately identical to the server's
/// pattern in answer.py -- if these two disagree, the app either renders a
/// citation the server verified as plain text, or offers a chip for something
/// the server never checked.
final _citationPattern = RegExp(
  r'\[Law\s*([^\s/,\]]+)\s*/\s*(\d{4})\s*,\s*Art\.?\s*([^\]]+)\]',
);

/// The disclaimer the backend appends, wrapped in markdown emphasis.
final _trailingDisclaimer = RegExp(r'\n*_([^_]+)_\s*$');

/// The direction a run of text should be laid out in.
///
/// First-strong-character, per the Unicode bidi heuristic. Necessary because
/// the answer's language follows the *question*, not the app's locale: an
/// Arabic answer inside an English UI still has to render right-to-left, and
/// inheriting the app's direction would left-align it and put its punctuation
/// on the wrong side.
TextDirection directionOf(String text) {
  for (final rune in text.runes) {
    if (rune >= 0x0600 && rune <= 0x06FF) return TextDirection.rtl; // Arabic
    if (rune >= 0x0750 && rune <= 0x077F) return TextDirection.rtl; // Supplement
    if (rune >= 0xFB50 && rune <= 0xFDFF) return TextDirection.rtl; // Pres. forms
    if (rune >= 0x0590 && rune <= 0x05FF) return TextDirection.rtl; // Hebrew
    final isLatinLetter =
        (rune >= 0x41 && rune <= 0x5A) || (rune >= 0x61 && rune <= 0x7A);
    if (isLatinLetter) return TextDirection.ltr;
  }
  return TextDirection.ltr;
}

/// Renders an answer: its prose, its citations as tappable chips, and the
/// disclaimer set apart from both.
class AnswerText extends StatelessWidget {
  const AnswerText({
    super.key,
    required this.text,
    required this.articles,
    this.onCitationTap,
  });

  final String text;

  /// The retrieved articles, used to resolve a citation to something openable.
  final List<Article> articles;
  final void Function(Article article)? onCitationTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final match = _trailingDisclaimer.firstMatch(text);
    final body = match == null ? text : text.substring(0, match.start);
    final disclaimer = match?.group(1);

    final byCitation = {for (final a in articles) a.citation: a};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (body.trim().isNotEmpty)
          Directionality(
            textDirection: directionOf(body),
            child: RichText(
              text: TextSpan(
                style: theme.textTheme.bodyLarge,
                children: _spans(context, body, byCitation),
              ),
            ),
          ),
        if (disclaimer != null) ...[
          const SizedBox(height: 12),
          Directionality(
            textDirection: directionOf(disclaimer),
            child: Text(
              disclaimer,
              style: theme.textTheme.bodySmall?.copyWith(
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ],
    );
  }

  List<InlineSpan> _spans(
    BuildContext context,
    String body,
    Map<String, Article> byCitation,
  ) {
    final theme = Theme.of(context);
    final spans = <InlineSpan>[];
    var cursor = 0;

    for (final match in _citationPattern.allMatches(body)) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: body.substring(cursor, match.start)));
      }

      final canonical =
          '${match.group(1)}/${match.group(2)} Art. ${match.group(3)!.trim()}';
      final article = byCitation[canonical];
      final label = 'Art. ${match.group(3)!.trim()} · ${match.group(1)}/${match.group(2)}';

      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: _CitationChip(
            label: label,
            // A citation with no matching article is shown flat rather than as
            // a dead tappable chip. The server would have blocked the answer
            // if it did not resolve, so this is a display gap, not a bad
            // citation -- but it must not look actionable either way.
            onTap: article == null || onCitationTap == null
                ? null
                : () => onCitationTap!(article),
          ),
        ),
      );
      cursor = match.end;
    }

    if (cursor < body.length) {
      spans.add(TextSpan(text: body.substring(cursor)));
    }
    if (spans.isEmpty) {
      spans.add(TextSpan(text: body, style: theme.textTheme.bodyLarge));
    }
    return spans;
  }
}

class _CitationChip extends StatelessWidget {
  const _CitationChip({required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;

    return Padding(
      padding: const EdgeInsetsDirectional.only(start: 2, end: 2),
      child: Material(
        color: accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(6),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            child: Directionality(
              // Citations are always Latin-script law numbers; forcing LTR
              // stops them being reordered inside an Arabic paragraph.
              textDirection: TextDirection.ltr,
              child: Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: accent,
                  fontWeight: FontWeight.w600,
                  height: 1.2,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Plain text that lays itself out according to its own script.
class BidiText extends StatelessWidget {
  const BidiText(this.text, {super.key, this.style, this.maxLines});

  final String text;
  final TextStyle? style;
  final int? maxLines;

  @override
  Widget build(BuildContext context) => Directionality(
    textDirection: directionOf(text),
    child: Text(
      text,
      style: style,
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
    ),
  );
}
