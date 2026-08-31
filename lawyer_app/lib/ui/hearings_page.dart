import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/practice_repository.dart';
import '../models/hearing.dart';

/// The court diary, and the one screen that writes.
///
/// Recording an outcome is the app's reason to allow writes at all: a lawyer
/// leaving a courtroom has it in their head and a phone in their hand, and by
/// the time they reach a desk it is a half-remembered note.
class HearingsPage extends StatefulWidget {
  const HearingsPage({super.key, required this.repository});

  final PracticeRepository repository;

  @override
  State<HearingsPage> createState() => _HearingsPageState();
}

class _HearingsPageState extends State<HearingsPage> {
  late Future<List<Hearing>> _hearings;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _hearings = widget.repository.hearings();
  }

  Future<void> _refresh() async {
    final next = widget.repository.hearings();
    setState(() => _hearings = next);
    await next;
  }

  bool _matches(Hearing h) {
    if (_query.isEmpty) return true;
    final needle = _query.toLowerCase();
    // Across every column shown, matching the web app's hearings tab -- a
    // lawyer searches for whatever they remember, which is as often the judge
    // or the court as the case name.
    return [h.matterName, h.court, h.judge, h.purpose, h.hearingTime]
        .any((field) => field.toLowerCase().contains(needle));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('الجلسات')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'ابحث في المحكمة أو القاضي أو القضية',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Hearing>>(
              future: _hearings,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('تعذّر التحميل: ${snapshot.error}'));
                }
                final rows = snapshot.data!.where(_matches).toList();
                if (rows.isEmpty) {
                  return const Center(child: Text('لا توجد جلسات مطابقة.'));
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                    itemCount: rows.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) => _HearingCard(
                      hearing: rows[index],
                      onRecord: () => _record(rows[index]),
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

  Future<void> _record(Hearing hearing) async {
    final result = await showModalBottomSheet<_Outcome>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _RecordOutcomeSheet(hearing: hearing),
    );
    if (result == null) return;

    try {
      await widget.repository.recordOutcome(
        hearing.id,
        outcome: result.outcome,
        note: result.note,
        adjournedTo: result.adjournedTo,
      );
      if (!mounted) return;
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      // Said out loud rather than swallowed: a write that looks saved and was
      // not is the failure worth avoiding on a court diary.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('لم يُحفظ: $error')),
      );
    }
  }
}

class _HearingCard extends StatelessWidget {
  const _HearingCard({required this.hearing, required this.onRecord});

  final Hearing hearing;
  final VoidCallback onRecord;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = DateFormat('EEEE d MMMM y', 'ar').format(hearing.hearingDate);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              hearing.matterName,
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            _Line(icon: Icons.event, text: '$date  ${hearing.hearingTime}'),
            if (hearing.court.isNotEmpty)
              _Line(icon: Icons.account_balance, text: hearing.court),
            if (hearing.judge.isNotEmpty)
              _Line(icon: Icons.person_outline, text: hearing.judge),
            if (hearing.purpose.isNotEmpty)
              _Line(icon: Icons.subject, text: hearing.purpose),
            const SizedBox(height: 8),
            if (hearing.isRecorded)
              Row(
                children: [
                  Icon(Icons.check_circle, size: 16, color: theme.colorScheme.primary),
                  const SizedBox(width: 6),
                  Expanded(child: Text(hearing.outcome!)),
                ],
              )
            else
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: OutlinedButton.icon(
                  onPressed: onRecord,
                  icon: const Icon(Icons.edit_note, size: 18),
                  label: const Text('سجّل ما حدث'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: theme.colorScheme.outline),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: theme.textTheme.bodySmall),
          ),
        ],
      ),
    );
  }
}

class _Outcome {
  const _Outcome(this.outcome, this.note, this.adjournedTo);
  final String outcome;
  final String? note;
  final DateTime? adjournedTo;
}

class _RecordOutcomeSheet extends StatefulWidget {
  const _RecordOutcomeSheet({required this.hearing});

  final Hearing hearing;

  @override
  State<_RecordOutcomeSheet> createState() => _RecordOutcomeSheetState();
}

class _RecordOutcomeSheetState extends State<_RecordOutcomeSheet> {
  // The four things that actually happen at an Egyptian sitting. Free text
  // would be more flexible and much less useful: these are what the diary is
  // later filtered and counted by.
  static const _options = {
    'adjourned': 'تأجيل',
    'reserved_for_judgment': 'حجز للحكم',
    'judgment': 'صدور حكم',
    'struck_out': 'شطب',
  };

  String _outcome = 'adjourned';
  final _note = TextEditingController();
  DateTime? _adjournedTo;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  bool get _needsDate => _outcome == 'adjourned';

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
          Text(
            'ما الذي حدث؟',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          // RadioGroup, not per-tile groupValue/onChanged: those were
          // deprecated after 3.32 and this SDK is 3.38.
          RadioGroup<String>(
            groupValue: _outcome,
            onChanged: (value) => setState(() => _outcome = value!),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final entry in _options.entries)
                  RadioListTile<String>(
                    value: entry.key,
                    title: Text(entry.value),
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
              ],
            ),
          ),
          if (_needsDate)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.event),
              title: Text(
                _adjournedTo == null
                    ? 'تاريخ الجلسة القادمة'
                    : DateFormat('d MMMM y', 'ar').format(_adjournedTo!),
              ),
              onTap: () async {
                final now = DateTime.now();
                final picked = await showDatePicker(
                  context: context,
                  initialDate: now.add(const Duration(days: 30)),
                  firstDate: now,
                  lastDate: DateTime(now.year + 3),
                  locale: const Locale('ar'),
                );
                if (picked != null) setState(() => _adjournedTo = picked);
              },
            ),
          TextField(
            controller: _note,
            decoration: const InputDecoration(
              labelText: 'ملاحظة (اختياري)',
              border: OutlineInputBorder(),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 16),
          FilledButton(
            // Blocked rather than defaulted: an adjournment with a guessed
            // next date is a wrong date in a court diary, which is worse than
            // a missing one because nobody goes back to check it.
            onPressed: _needsDate && _adjournedTo == null
                ? null
                : () => Navigator.pop(
                    context,
                    _Outcome(_outcome, _note.text.trim(), _adjournedTo),
                  ),
            child: const Text('حفظ'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
