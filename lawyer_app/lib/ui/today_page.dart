import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/theme.dart';
import '../data/practice_repository.dart';
import '../models/agenda.dart';

/// The screen the app opens to, and the reason it exists on a phone.
///
/// Distinct from the web dashboard, which answers "how is the firm doing".
/// This answers "what is mine and what is now", which is the only question
/// worth asking in a corridor between sittings.
///
/// OVERDUE COMES FIRST AND IS NEVER COLLAPSED. The server returns it
/// separately and without limit; a deadline missed last week is the single
/// item most worth shoving in front of somebody, and it is exactly the one a
/// horizon starting today would drop.
class TodayPage extends StatefulWidget {
  const TodayPage({super.key, required this.repository});

  final PracticeRepository repository;

  @override
  State<TodayPage> createState() => _TodayPageState();
}

class _TodayPageState extends State<TodayPage> {
  late Future<Agenda> _agenda;

  @override
  void initState() {
    super.initState();
    _agenda = widget.repository.myDay();
  }

  Future<void> _refresh() async {
    final next = widget.repository.myDay();
    setState(() => _agenda = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('يومي'),
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'تحديث',
          ),
        ],
      ),
      body: FutureBuilder<Agenda>(
        future: _agenda,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _Failed(error: snapshot.error!, onRetry: _refresh);
          }

          final agenda = snapshot.data!;
          if (agenda.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('لا شيء مستحق اليوم ولا خلال أسبوع.')),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                if (agenda.overdue.isNotEmpty)
                  _Section(
                    title: 'متأخر',
                    accent: overdueRed,
                    items: agenda.overdue,
                  ),
                if (agenda.today.isNotEmpty)
                  _Section(title: 'اليوم', items: agenda.today),
                if (agenda.upcoming.isNotEmpty)
                  _Section(title: 'قادم', items: agenda.upcoming),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.items, this.accent});

  final String title;
  final List<AgendaItem> items;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 16, 4, 8),
          child: Row(
            children: [
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: accent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${items.length}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
          ),
        ),
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _ItemCard(item: item, accent: accent),
          ),
      ],
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({required this.item, this.accent});

  final AgendaItem item;
  final Color? accent;

  static const _icons = {
    AgendaKind.hearing: Icons.gavel,
    AgendaKind.deadline: Icons.event_busy,
    AgendaKind.task: Icons.check_circle_outline,
  };

  static const _labels = {
    AgendaKind.hearing: 'جلسة',
    AgendaKind.deadline: 'ميعاد',
    AgendaKind.task: 'مهمة',
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Explicit locale, never the runtime default: the same class of bug that
    // put Arabic-Indic digits on the web app's calendar on a machine whose OS
    // locale differed from its browser's.
    final date = DateFormat('d MMMM', 'ar').format(item.onDate);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              _icons[item.kind],
              size: 20,
              color: accent ?? theme.colorScheme.primary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (item.matterName.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.matterName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  date,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: accent ?? theme.colorScheme.outline,
                    fontWeight: accent == null ? null : FontWeight.w700,
                  ),
                ),
                Text(
                  _labels[item.kind]!,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.outline,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Failed extends StatelessWidget {
  const _Failed({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 40),
            const SizedBox(height: 12),
            const Text(
              'تعذّر الوصول إلى الخادم.',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              '$error',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
          ],
        ),
      ),
    );
  }
}
