import 'package:equatable/equatable.dart';

/// A case. Shape taken from a live GET /api/orgs/{id}/matters.
///
/// Only the fields a phone screen shows are parsed. The endpoint returns
/// budgets, tags, descriptions and staff too; adding them here without a
/// screen that renders them would be code that cannot be wrong because
/// nothing reads it.
class Matter extends Equatable {
  const Matter({
    required this.id,
    required this.matterNumber,
    required this.name,
    required this.clientName,
    required this.matterType,
    required this.status,
    required this.openedDate,
    required this.nextDeadlineLabel,
    required this.nextDeadlineDate,
  });

  final int id;
  final String matterNumber;
  final String name;
  final String clientName;
  final String matterType;
  final String status;
  final DateTime? openedDate;

  /// The next thing due on this case, already computed by the server.
  final String? nextDeadlineLabel;
  final DateTime? nextDeadlineDate;

  bool get isOpen => status == 'active';

  static DateTime? _date(dynamic raw) =>
      raw == null ? null : DateTime.parse(raw as String);

  factory Matter.fromJson(Map<String, dynamic> json) {
    final deadline = json['next_deadline'] as Map<String, dynamic>?;
    return Matter(
      id: json['id'] as int,
      matterNumber: json['matter_number'] as String? ?? '',
      name: json['name'] as String? ?? '',
      clientName: json['client_name'] as String? ?? '',
      matterType: json['matter_type'] as String? ?? '',
      status: json['status'] as String? ?? '',
      openedDate: _date(json['opened_date']),
      nextDeadlineLabel: deadline?['label'] as String?,
      nextDeadlineDate: _date(deadline?['due_date']),
    );
  }

  @override
  List<Object?> get props => [id, status, name];
}
