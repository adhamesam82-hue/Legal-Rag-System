import 'package:dio/dio.dart';

import '../auth/auth_gateway.dart';
import 'config.dart';

/// The app's single Dio instance, authenticated by [gateway].
///
/// Adapted from mobile/lib/core/api_client.dart. The 401-refresh-and-retry is
/// carried over unchanged because it is provider-agnostic: it asks the gateway
/// for a fresh token and retries once, which is as true of a Clerk session
/// token as of a Firebase ID token.
Dio buildApiClient(AppConfig config, AuthGateway gateway) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      // Shorter than mobile/'s 120s. Every call this app makes is a list read
      // off indexed columns; nothing here waits on a model. A long timeout
      // would only turn a dead server into a very slow spinner.
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(_AuthInterceptor(dio, gateway));
  return dio;
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._dio, this._gateway);

  final Dio _dio;
  final AuthGateway _gateway;

  static const _retriedKey = '_authRetry';

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Null when signed out, and null throughout in dev-auth mode, where the
    // backend decides who the caller is and no token is expected.
    final token = await _gateway.idToken();
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final options = error.requestOptions;
    final alreadyRetried = options.extra[_retriedKey] == true;

    if (error.response?.statusCode != 401 || alreadyRetried) {
      return handler.next(error);
    }

    final refreshed = await _gateway.idToken(forceRefresh: true);
    if (refreshed == null) return handler.next(error);

    // Marked BEFORE the retry, so a second 401 falls straight through instead
    // of refreshing forever against a server that will never accept us.
    options.extra[_retriedKey] = true;
    options.headers['Authorization'] = 'Bearer $refreshed';

    try {
      handler.resolve(await _dio.fetch(options));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }
}
