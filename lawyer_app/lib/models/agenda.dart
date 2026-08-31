import 'package:equatable/equatable.dart';

/// One thing with a date on it: a hearing, a procedural deadline, or a task.
///
/// Mirrors AgendaItem in src/legalrag/practice/agenda.py. The three kinds share
/// a shape on purpose -- the screen this feeds is one list sorted by date, and
/// a lawyer scanning it in a corridor cares when something is, not which table
/// it came out of.
enum AgendaKind {
  hearing,
  deadline,
  task;

  static AgendaKind parse(String raw) => switch (raw) {
    'hearing' => AgendaKind.hearing,
    'deadline' => AgendaKind.deadline,
    _ => AgendaKind.task,
  };
}

class AgendaItem extends Equatable {
  const AgendaItem({
    required this.kind,
    required this.id,
    required this.onDate,
    required this.title,
    required this.matterId,
    required this.matterName,
    required this.detail,
  });

  final AgendaKind kind;
  final int id;
  final DateTime onDate;
  final String title;
  final int? matterId;
  final String matterName;
  final String detail;

  factory AgendaItem.fromJson(Map<String, dynamic> json) => AgendaItem(
    kind: AgendaKind.parse(json['kind'] as String? ?? 'task'),
    id: json['id'] as int,
    onDate: DateTime.parse(json['on_date'] as String),
    title: json['title'] as String? ?? '',
    matterId: json['matter_id'] as int?,
    matterName: json['matter_name'] as String? ?? '',
    detail: json['detail'] as String? ?? '',
  );

  @override
  List<Object?> get props => [kind, id, onDate, title, matterId];
}

/// The whole screen's payload, already split by the server.
///
/// The split is the server's rather than this app's because it is a decision
/// about the product, not about presentation: overdue is returned in full and
/// separately so a deadline missed last week cannot fall off the bottom of a
/// horizon that starts today.
class Agenda extends Equatable {
  const Agenda({
    required this.overdue,
    required this.today,
    required this.upcoming,
  });

  final List<AgendaItem> overdue;
  final List<AgendaItem> today;
  final List<AgendaItem> upcoming;

  bool get isEmpty => overdue.isEmpty && today.isEmpty && upcoming.isEmpty;

  static List<AgendaItem> _items(dynamic raw) => (raw as List? ?? [])
      .map((e) => AgendaItem.fromJson(e as Map<String, dynamic>))
      .toList();

  factory Agenda.fromJson(Map<String, dynamic> json) => Agenda(
    overdue: _items(json['overdue']),
    // Named today_items on the wire: `today` there is the DATE the sweep ran
    // for, not the list. Renamed here because nothing in this app needs the
    // date and everything needs the list.
    today: _items(json['today_items']),
    upcoming: _items(json['upcoming']),
  );

  @override
  List<Object?> get props => [overdue, today, upcoming];
}
