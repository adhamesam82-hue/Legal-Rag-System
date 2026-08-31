import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/theme.dart';
import '../data/practice_repository.dart';
import '../models/matter.dart';

/// Looking a case up, which on a phone is nearly always because somebody has
/// just asked a question about it out loud.
///
/// So: search first, and every list filtered locally after one fetch. A round
/// trip per keystroke on a courthouse 3G connection is slower than the person
/// asking is patient.
class MattersPage extends StatefulWidget {
  const MattersPage({super.key, required this.repository});

  final PracticeRepository repository;

  @override
  State<MattersPage> createState() => _MattersPageState();
}

class _MattersPageState extends State<MattersPage> {
  late Future<List<Matter>> _matters;
  String _query = '';
  bool _openOnly = true;

  @override
  void initState() {
    super.initState();
    _matters = widget.repository.matters();
  }

  Future<void> _refresh() async {
    final next = widget.repository.matters();
    setState(() => _matters = next);
    await next;
  }

  bool _matches(Matter m) {
    if (_openOnly && !m.isOpen) return false;
    if (_query.isEmpty) return true;
    final needle = _query.toLowerCase();
    return [m.name, m.clientName, m.matterNumber]
        .any((field) => field.toLowerCase().contains(needle));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('القضايا')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'ابحث بالاسم أو الموكّل أو الرقم',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
          ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: FilterChip(
                label: const Text('المفتوحة فقط'),
                selected: _openOnly,
                onSelected: (value) => setState(() => _openOnly = value),
              ),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Matter>>(
              future: _matters,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('تعذّر التحميل: ${snapshot.error}'));
                }
                final rows = snapshot.data!.where(_matches).toList();
                if (rows.isEmpty) {
                  return const Center(child: Text('لا توجد قضايا مطابقة.'));
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    itemCount: rows.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) => _MatterCard(
                      matter: rows[index],
                      repository: widget.repository,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MatterCard extends StatelessWidget {
  const _MatterCard({required this.matter, required this.repository});

  final Matter matter;
  final PracticeRepository repository;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final deadline = matter.nextDeadlineDate;
    final isLate = deadline != null && deadline.isBefore(DateTime.now());

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    matter.name,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (!matter.isOpen)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('مغلقة', style: theme.textTheme.labelSmall),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${matter.clientName} · ${matter.matterNumber}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
            if (deadline != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.flag_outlined,
                    size: 15,
                    color: isLate ? overdueRed : theme.colorScheme.outline,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${matter.nextDeadlineLabel ?? ''} — '
                      '${DateFormat('d MMMM y', 'ar').format(deadline)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isLate ? overdueRed : null,
                        fontWeight: isLate ? FontWeight.w700 : null,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: () => _logTime(context),
                icon: const Icon(Icons.timer_outlined, size: 18),
                label: const Text('سجّل وقتًا'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _logTime(BuildContext context) async {
    final entry = await showModalBottomSheet<({double hours, String what})>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _LogTimeSheet(matter: matter),
    );
    if (entry == null || !context.mounted) return;

    try {
      await repository.logTime(
        matterId: matter.id,
        hours: entry.hours,
        description: entry.what,
      );
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('سُجِّل الوقت.')),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('لم يُحفظ: $error')),
      );
    }
  }
}

class _LogTimeSheet extends StatefulWidget {
  const _LogTimeSheet({required this.matter});

  final Matter matter;

  @override
  State<_LogTimeSheet> createState() => _LogTimeSheetState();
}

class _LogTimeSheetState extends State<_LogTimeSheet> {
  final _hours = TextEditingController();
  final _what = TextEditingController();

  @override
  void dispose() {
    _hours.dispose();
    _what.dispose();
    super.dispose();
  }

  double? get _parsedHours {
    final value = double.tryParse(_hours.text.trim());
    if (value == null || value <= 0 || value > 24) return null;
    return value;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.matter.name, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          TextField(
            controller: _hours,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'عدد الساعات',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _what,
            decoration: const InputDecoration(
              labelText: 'ما الذي تم',
              border: OutlineInputBorder(),
            ),
            maxLines: 2,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _parsedHours == null || _what.text.trim().isEmpty
                ? null
                : () => Navigator.pop(
                    context,
                    (hours: _parsedHours!, what: _what.text.trim()),
                  ),
            child: const Text('حفظ'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
