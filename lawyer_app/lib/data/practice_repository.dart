import 'package:dio/dio.dart';

import '../models/agenda.dart';
import '../models/hearing.dart';
import '../models/matter.dart';

/// Everything this app asks the backend for.
///
/// One class rather than one per screen: there are six calls in total and
/// splitting them would spread the organization-id prefix over six files, each
/// of which could then forget it.
class PracticeRepository {
  PracticeRepository(this._dio, this._organizationId);

  final Dio _dio;
  final int _organizationId;

  String _path(String suffix) => '/api/orgs/$_organizationId/$suffix';

  /// The screen the app opens to: what is mine, and what is now.
  Future<Agenda> myDay({int horizonDays = 7}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      _path('my-day'),
      queryParameters: {'horizon_days': horizonDays},
    );
    return Agenda.fromJson(response.data!);
  }

  Future<List<Matter>> matters({String? status, String? search}) async {
    final response = await _dio.get<List<dynamic>>(
      _path('matters'),
      queryParameters: {
        if (status != null) 'status': status,
        if (search != null && search.isNotEmpty) 'q': search,
      },
    );
    return (response.data ?? [])
        .map((e) => Matter.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Hearing>> hearings({int? matterId}) async {
    final response = await _dio.get<List<dynamic>>(
      _path('hearings'),
      queryParameters: {if (matterId != null) 'matter_id': matterId},
    );
    return (response.data ?? [])
        .map((e) => Hearing.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Recording what happened at a sitting. The app's reason to allow writes.
  ///
  /// A lawyer leaving a courtroom has the outcome in their head and a phone in
  /// their hand; by the time they reach a desk it is a half-remembered note.
  Future<Hearing> recordOutcome(
    int hearingId, {
    required String outcome,
    String? note,
    DateTime? adjournedTo,
  }) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      _path('hearings/$hearingId'),
      data: {
        'outcome': outcome,
        if (note != null && note.isNotEmpty) 'outcome_note': note,
        if (adjournedTo != null)
          'next_hearing_date': _isoDate(adjournedTo),
      },
    );
    return Hearing.fromJson(response.data!);
  }

  Future<void> logTime({
    required int matterId,
    required double hours,
    required String description,
    DateTime? on,
  }) async {
    await _dio.post(
      _path('time-entries'),
      data: {
        'matter_id': matterId,
        'hours': hours,
        'description': description,
        'entry_date': _isoDate(on ?? DateTime.now()),
      },
    );
  }

  /// Registers this handset for push, so the reminder sweep can reach it.
  ///
  /// Idempotent by token on the server, and re-registration reassigns rather
  /// than duplicates -- a handset that changes hands inside a firm must not
  /// put one lawyer's hearing on another's lock screen.
  Future<void> registerDevice({
    required String token,
    required String platform,
    String label = '',
  }) async {
    await _dio.put(
      _path('devices'),
      data: {'token': token, 'platform': platform, 'device_label': label},
    );
  }

  /// Date only, no time and no zone.
  ///
  /// toIso8601String() would send a full timestamp, and the server's columns
  /// are DATE -- a hearing on the 12th sent as 2026-08-12T23:00:00Z from a
  /// device an hour ahead of UTC lands on the 13th.
  static String _isoDate(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-'
      '${value.month.toString().padLeft(2, '0')}-'
      '${value.day.toString().padLeft(2, '0')}';
}
