import 'dart:async';

import 'package:dio/dio.dart';

import '../core/sse.dart';
import '../models/article.dart';
import '../models/ask_event.dart';
import '../models/conversation.dart';

/// Everything the app asks of the backend.
class AssistantRepository {
  AssistantRepository(this._dio);

  final Dio _dio;

  /// Ask a question, streaming the answer as the server releases it.
  ///
  /// Omitting [conversationId] starts a new conversation; the id it was saved
  /// under arrives in the first [ArticlesRetrieved] event.
  ///
  /// Transport failures are surfaced as a terminal [AskFailed] rather than as
  /// a thrown exception, so a caller has one place to handle "this turn did
  /// not produce an answer" instead of two.
  Stream<AskEvent> ask({
    required String question,
    String jurisdiction = 'EG',
    int? conversationId,
    int limit = 8,
    CancelToken? cancelToken,
  }) async* {
    late final Response<ResponseBody> response;
    try {
      response = await _dio.post<ResponseBody>(
        '/api/ask/stream',
        data: {
          'question': question,
          'jurisdiction': jurisdiction,
          'limit': limit,
          if (conversationId != null) 'conversation_id': conversationId,
        },
        cancelToken: cancelToken,
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Accept': 'text/event-stream'},
          // The whole point is a response that stays open; a receive timeout
          // would cut the answer off mid-sentence on a slow model.
          receiveTimeout: Duration.zero,
        ),
      );
    } on DioException catch (error) {
      yield _failureFrom(error);
      return;
    }

    final body = response.data;
    if (body == null) {
      yield const AskFailed(status: 502, detail: 'Empty response from server');
      return;
    }

    try {
      await for (final event in parseSse(body.stream)) {
        switch (event.event) {
          case 'articles':
            yield ArticlesRetrieved.fromJson(event.data);
          case 'delta':
            yield AnswerDelta(event.data['text'] as String? ?? '');
          case 'done':
            yield AnswerCompleted.fromJson(event.data);
          case 'error':
            yield AskFailed.fromJson(event.data);
        }
      }
    } on DioException catch (error) {
      yield _failureFrom(error);
    } catch (error) {
      yield AskFailed(status: 500, detail: error.toString());
    }
  }

  Future<List<Conversation>> conversations({int limit = 50}) async {
    final response = await _dio.get<List<dynamic>>(
      '/api/conversations',
      queryParameters: {'limit': limit},
    );
    return (response.data ?? [])
        .map((e) => Conversation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ConversationDetail> conversation(int id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/conversations/$id',
    );
    return ConversationDetail.fromJson(response.data!);
  }

  Future<void> deleteConversation(int id) =>
      _dio.delete<void>('/api/conversations/$id');

  Future<Conversation> renameConversation(int id, String title) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/api/conversations/$id',
      data: {'title': title},
    );
    return Conversation.fromJson(response.data!);
  }

  Future<Article> article(int id) async {
    final response = await _dio.get<Map<String, dynamic>>('/api/articles/$id');
    return Article.fromJson(response.data!['article'] as Map<String, dynamic>);
  }

  AskFailed _failureFrom(DioException error) {
    final status = error.response?.statusCode ?? 0;
    final detail = error.response?.data;

    // FastAPI puts the message in `detail`; that wording is written for the
    // user (out of credits, corpus unavailable) so it is preferred over Dio's.
    if (detail is Map && detail['detail'] is String) {
      return AskFailed(status: status, detail: detail['detail'] as String);
    }
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      return AskFailed(
        status: 0,
        detail: 'Could not reach the server at ${_dio.options.baseUrl}.',
      );
    }
    return AskFailed(
      status: status == 0 ? 500 : status,
      detail: error.message ?? error.toString(),
    );
  }
}
