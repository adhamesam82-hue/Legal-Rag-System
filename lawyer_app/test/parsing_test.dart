/// Parsing the backend's real payloads.
///
/// The JSON in these tests was copied from live responses of a running API
/// (GET /api/orgs/1/my-day, /matters, /hearings), not written from the Python
/// source. A model that agrees with what I believed the endpoint returns is
/// worth nothing; one that agrees with what it actually returned is worth
/// something.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:legalos_lawyer/models/agenda.dart';
import 'package:legalos_lawyer/models/document.dart';
import 'package:legalos_lawyer/models/hearing.dart';
import 'package:legalos_lawyer/models/matter.dart';

void main() {
  group('Agenda', () {
    // Verbatim from GET /api/orgs/1/my-day.
    final payload = {
      'today': '2026-08-31',
      'horizon_days': 7,
      'overdue': [
        {
          'kind': 'task',
          'id': 9,
          'on_date': '2026-08-05',
          'title': 'إعداد عرض شراء الحصة لجلسة الوساطة',
          'matter_id': 6,
          'matter_name': 'قسمة تركة المرحوم محمود السيد',
          'detail': 'high',
        },
      ],
      'today_items': <dynamic>[],
      'upcoming': <dynamic>[],
      'counts': {'overdue': 1, 'today': 0, 'upcoming': 0},
    };

    test('overdue survives the round trip', () {
      final agenda = Agenda.fromJson(payload);
      expect(agenda.overdue, hasLength(1));
      expect(agenda.overdue.first.kind, AgendaKind.task);
      expect(agenda.overdue.first.matterName, 'قسمة تركة المرحوم محمود السيد');
    });

    test('today comes from today_items, not today', () {
      // `today` on the wire is the DATE, not the list. Reading the wrong one
      // would put a string where a list belongs and throw at runtime.
      expect(Agenda.fromJson(payload).today, isEmpty);
    });

    test('an empty day is a shape, not an error', () {
      final empty = Agenda.fromJson({
        'overdue': <dynamic>[],
        'today_items': <dynamic>[],
        'upcoming': <dynamic>[],
      });
      expect(empty.isEmpty, isTrue);
    });

    test('an unknown kind does not throw', () {
      // The server may grow a fourth kind before this app is rebuilt; falling
      // back beats crashing the one screen a lawyer opens in a corridor.
      final item = AgendaItem.fromJson({
        'kind': 'something_new',
        'id': 1,
        'on_date': '2026-08-05',
        'title': 't',
        'matter_id': null,
        'matter_name': '',
        'detail': '',
      });
      expect(item.kind, AgendaKind.task);
    });
  });

  group('Hearing', () {
    // Verbatim from GET /api/orgs/1/hearings.
    final payload = {
      'id': 6,
      'matter_id': 3,
      'matter_name': 'نزاع عمالي — دلتا للأغذية',
      'hearing_date': '2026-08-12',
      'hearing_time': '1:30 م',
      'court': 'محكمة العمل بالقاهرة',
      'judge': 'المستشارة ميرفت شوقي',
      'purpose': 'المرافعة الختامية',
      'outcome': null,
      'outcome_note': null,
      'next_hearing_date': null,
    };

    test('the Arabic time string is kept as typed', () {
      // Not parsed into a TimeOfDay: the column also holds "الجلسة الأولى"
      // and empty strings, and inventing 00:00 for those would be worse than
      // showing what the clerk wrote.
      expect(Hearing.fromJson(payload).hearingTime, '1:30 م');
    });

    test('an unrecorded outcome is not mistaken for a recorded one', () {
      expect(Hearing.fromJson(payload).isRecorded, isFalse);
    });

    test('a recorded outcome reads as recorded', () {
      final recorded = Hearing.fromJson({
        ...payload,
        'outcome': 'تأجيل',
        'next_hearing_date': '2026-09-20',
      });
      expect(recorded.isRecorded, isTrue);
      expect(recorded.nextHearingDate, DateTime(2026, 9, 20));
    });
  });

  group('Matter', () {
    // Verbatim from GET /api/orgs/1/matters.
    final payload = {
      'id': 5,
      'matter_number': '00005',
      'client_name': 'شركة الأمل للتجارة',
      'name': 'تجديد السجل التجاري — شركة الأمل للتجارة',
      'matter_type': 'corporate',
      'status': 'active',
      'opened_date': '2026-06-30',
      'next_deadline': {
        'label': 'تجديد السجل التجاري',
        'due_date': '2026-08-09',
      },
    };

    test('the nested next_deadline is flattened', () {
      final matter = Matter.fromJson(payload);
      expect(matter.nextDeadlineLabel, 'تجديد السجل التجاري');
      expect(matter.nextDeadlineDate, DateTime(2026, 8, 9));
    });

    test('a matter with no deadline is fine', () {
      final matter = Matter.fromJson({...payload, 'next_deadline': null});
      expect(matter.nextDeadlineDate, isNull);
    });

    test('status drives isOpen', () {
      expect(Matter.fromJson(payload).isOpen, isTrue);
      expect(Matter.fromJson({...payload, 'status': 'closed'}).isOpen, isFalse);
    });
  });

  group('MatterDocument', () {
    // Verbatim from GET /api/orgs/1/documents.
    final payload = {
      'id': 11,
      'matter_id': 3,
      'matter_name': 'نزاع عمالي — دلتا للأغذية',
      'name': 'ملفات العاملين — تحت المراجعة',
      'doc_type': 'ZIP',
      'status': 'under_review',
      'size_bytes': 5347737,
      'storage_key': null,
      'uploaded_at': '2026-07-29T00:00:00+00:00',
      'visible_to_client': false,
    };

    test('a row with no storage_key has no file', () {
      // The content endpoint 404s for these. The screen must not offer to
      // open them -- a button that always fails is worse than an absent one,
      // because the lawyer retries it standing in a corridor.
      expect(MatterDocument.fromJson(payload).hasFile, isFalse);
    });

    test('a stored document has one', () {
      final stored = MatterDocument.fromJson({
        ...payload,
        'storage_key': 'orgs/1/documents/11.zip',
      });
      expect(stored.hasFile, isTrue);
    });

    test('size is rendered in units a person reads', () {
      expect(MatterDocument.fromJson(payload).readableSize, '5.1 م.ب');
    });

    test('a sizeless row renders nothing rather than "0"', () {
      final empty = MatterDocument.fromJson({...payload, 'size_bytes': 0});
      expect(empty.readableSize, isEmpty);
    });

    test('client visibility is carried through', () {
      expect(MatterDocument.fromJson(payload).visibleToClient, isFalse);
      expect(
        MatterDocument.fromJson({...payload, 'visible_to_client': true})
            .visibleToClient,
        isTrue,
      );
    });
  });
}
