import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/practice_repository.dart';
import '../models/document.dart';

/// Reading a case file away from the desk.
///
/// Read-only on purpose. Uploading from a phone is a different job with a
/// different failure mode -- a half-uploaded scan on a dying courthouse
/// connection is worse than no upload, because the row exists and the bytes do
/// not. That belongs with offline support (E-4), which is deliberately not
/// started.
class DocumentsPage extends StatefulWidget {
  const DocumentsPage({super.key, required this.repository});

  final PracticeRepository repository;

  @override
  State<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends State<DocumentsPage> {
  late Future<List<MatterDocument>> _documents;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _documents = widget.repository.documents();
  }

  Future<void> _refresh() async {
    final next = widget.repository.documents();
    setState(() => _documents = next);
    await next;
  }

  bool _matches(MatterDocument d) {
    if (_query.isEmpty) return true;
    final needle = _query.toLowerCase();
    return [d.name, d.matterName, d.docType]
        .any((field) => field.toLowerCase().contains(needle));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('المستندات')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'ابحث بالاسم أو القضية',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<MatterDocument>>(
              future: _documents,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('تعذّر التحميل: ${snapshot.error}'));
                }
                final rows = snapshot.data!.where(_matches).toList();
                if (rows.isEmpty) {
                  return const Center(child: Text('لا توجد مستندات مطابقة.'));
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                    itemCount: rows.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) =>
                        _DocumentCard(document: rows[index]),
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

class _DocumentCard extends StatelessWidget {
  const _DocumentCard({required this.document});

  final MatterDocument document;

  static const _statusAr = {
    'draft': 'مسودة',
    'under_review': 'قيد المراجعة',
    'final': 'نهائي',
    'filed': 'مودَع',
    'signed': 'موقَّع',
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final uploaded = document.uploadedAt;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.description_outlined,
                  size: 20,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        document.name,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        document.matterName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _Chip(text: _statusAr[document.status] ?? document.status),
                if (document.docType.isNotEmpty) _Chip(text: document.docType),
                if (document.readableSize.isNotEmpty)
                  Text(
                    document.readableSize,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                if (uploaded != null)
                  Text(
                    DateFormat('d MMMM y', 'ar').format(uploaded),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                if (document.visibleToClient)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.visibility_outlined,
                        size: 13,
                        color: theme.colorScheme.outline,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        'ظاهر للموكّل',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            if (!document.hasFile) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 14,
                    color: theme.colorScheme.outline,
                  ),
                  const SizedBox(width: 6),
                  // Said plainly instead of showing an Open button that would
                  // 404. The row is real; the file was never stored.
                  Text(
                    'لا يوجد ملف مرفوع لهذا المستند',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text, style: theme.textTheme.labelSmall),
    );
  }
}
