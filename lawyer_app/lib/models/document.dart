import 'package:equatable/equatable.dart';

/// A document on a case. Shape taken from a live GET /api/orgs/{id}/documents.
class MatterDocument extends Equatable {
  const MatterDocument({
    required this.id,
    required this.matterId,
    required this.matterName,
    required this.name,
    required this.docType,
    required this.status,
    required this.sizeBytes,
    required this.uploadedAt,
    required this.visibleToClient,
    required this.hasFile,
  });

  final int id;
  final int matterId;
  final String matterName;
  final String name;
  final String docType;
  final String status;
  final int sizeBytes;
  final DateTime? uploadedAt;

  /// Whether the firm has chosen to show this one in the client portal.
  final bool visibleToClient;

  /// Whether there are actually BYTES behind this row.
  ///
  /// A document can exist as metadata with no stored file -- every seeded row
  /// is like this, and so is anything catalogued before it was scanned. The
  /// content endpoint answers 404 for those, so the screen must not offer to
  /// open them: a button that always fails is worse than an absent one,
  /// because the lawyer retries it standing in a corridor.
  final bool hasFile;

  String get readableSize {
    if (sizeBytes <= 0) return '';
    const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
    var value = sizeBytes.toDouble();
    var unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return '${value.toStringAsFixed(unit == 0 ? 0 : 1)} ${units[unit]}';
  }

  factory MatterDocument.fromJson(Map<String, dynamic> json) => MatterDocument(
    id: json['id'] as int,
    matterId: json['matter_id'] as int? ?? 0,
    matterName: json['matter_name'] as String? ?? '',
    name: json['name'] as String? ?? '',
    docType: json['doc_type'] as String? ?? '',
    status: json['status'] as String? ?? '',
    sizeBytes: json['size_bytes'] as int? ?? 0,
    uploadedAt: json['uploaded_at'] == null
        ? null
        : DateTime.parse(json['uploaded_at'] as String),
    visibleToClient: json['visible_to_client'] as bool? ?? false,
    hasFile: json['storage_key'] != null,
  );

  @override
  List<Object?> get props => [id, name, status];
}
