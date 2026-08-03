import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../models/article.dart';
import 'answer_text.dart';

/// The articles an answer cited, as full statute text.
///
/// Full text rather than a summary: the product's claim is that an answer is
/// composed only from these words, and a summary would put a paraphrase
/// between the reader and the thing being verified.
class SourcesSheet extends StatelessWidget {
  const SourcesSheet({super.key, required this.articles, this.initial});

  final List<Article> articles;
  final Article? initial;

  static Future<void> show(
    BuildContext context, {
    required List<Article> articles,
    Article? initial,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Theme.of(context).colorScheme.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => SourcesSheet(articles: articles, initial: initial),
  );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);

    // A tapped citation is put first rather than scrolled to: the sheet opens
    // at the top, and reordering is what makes the article you asked for the
    // one you see.
    final ordered = initial == null
        ? articles
        : [initial!, ...articles.where((a) => a.id != initial!.id)];

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (context, controller) => ListView.separated(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        itemCount: ordered.length + 2,
        separatorBuilder: (_, _) => const SizedBox(height: 18),
        itemBuilder: (context, index) {
          if (index == 0) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.citedInThisAnswer,
                  style: theme.textTheme.headlineMedium?.copyWith(fontSize: 20),
                ),
                const SizedBox(height: 8),
                Text(
                  strings.knowledgeSourcesDescription,
                  style: theme.textTheme.bodySmall,
                ),
              ],
            );
          }
          if (index == ordered.length + 1) {
            return Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                strings.disclaimerFooter,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontStyle: FontStyle.italic,
                ),
              ),
            );
          }
          return ArticleCard(article: ordered[index - 1]);
        },
      ),
    );
  }
}

class ArticleCard extends StatelessWidget {
  const ArticleCard({super.key, required this.article});

  final Article article;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.brightness == Brightness.dark
            ? const Color(0xFF1B1B1D)
            : const Color(0xFFF7F7F8),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Directionality(
            textDirection: TextDirection.ltr,
            child: Text(
              'Art. ${article.articleNumber} · Law ${article.instrumentReference}',
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 4),
          BidiText(
            article.instrumentTitle,
            style: theme.textTheme.bodySmall,
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          BidiText(article.text, style: theme.textTheme.bodyMedium),
        ],
      ),
    );
  }
}
