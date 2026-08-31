import 'package:equatable/equatable.dart';

/// A sitting. Shape taken from a live GET /api/orgs/{id}/hearings, not guessed.
class Hearing extends Equatable {
  const Hearing({
    required this.id,
    required this.matterId,
    required this.matterName,
    required this.hearingDate,
    required this.hearingTime,
    required this.court,
    required this.judge,
    required this.purpose,
    required this.outcome,
    required this.outcomeNote,
    required this.nextHearingDate,
  });

  final int id;
  final int matterId;
  final String matterName;
  final DateTime hearingDate;

  /// Free text, and it has to stay that way here.
  ///
  /// The column holds "10:00", "1:30 م", "الجلسة الأولى" or nothing at all.
  /// Parsing it into a TimeOfDay would mean inventing a time for the rows that
  /// have no parseable one, and a made-up 00:00 on a court diary is worse than
  /// showing what the clerk actually typed.
  final String hearingTime;

  final String court;
  final String judge;
  final String purpose;

  /// Null until somebody records what happened. That is the app's one write.
  final String? outcome;
  final String? outcomeNote;
  final DateTime? nextHearingDate;

  bool get isRecorded => outcome != null && outcome!.isNotEmpty;

  static DateTime? _date(dynamic raw) =>
      raw == null ? null : DateTime.parse(raw as String);

  factory Hearing.fromJson(Map<String, dynamic> json) => Hearing(
    id: json['id'] as int,
    matterId: json['matter_id'] as int,
    matterName: json['matter_name'] as String? ?? '',
    hearingDate: DateTime.parse(json['hearing_date'] as String),
    hearingTime: json['hearing_time'] as String? ?? '',
    court: json['court'] as String? ?? '',
    judge: json['judge'] as String? ?? '',
    purpose: json['purpose'] as String? ?? '',
    outcome: json['outcome'] as String?,
    outcomeNote: json['outcome_note'] as String?,
    nextHearingDate: _date(json['next_hearing_date']),
  );

  @override
  List<Object?> get props => [id, hearingDate, outcome];
}
