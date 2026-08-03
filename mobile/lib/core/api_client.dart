import 'package:dio/dio.dart';

import '../auth/auth_gateway.dart';
import 'config.dart';

/// Builds the app's single Dio instance, authenticated by [gateway].
Dio buildApiClient(AppConfig config, AuthGateway gateway) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      // Generous, and deliberately so: an answer is a model call behind a
      // retrieval query, and the free NVIDIA tier is slow under load. A tight
      // receive timeout here shows up as a cancelled answer, not as an error
      // anyone can act on. The streaming request overrides this again.
      receiveTimeout: const Duration(seconds: 120),
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
    // Normally a cache read: Firebase ID tokens last an hour and the SDK
    // refreshes them in the background. Null when signed out, or when running
    // against a backend in dev-auth mode, where no token is expected.
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

    // The server rejected the token we hold. Usually a clock skew or a
    // revocation the SDK has not noticed; a forced refresh resolves it.
    final refreshed = await _gateway.idToken(forceRefresh: true);
    if (refreshed == null) {
      // Nothing left to try — the user is genuinely signed out. The auth
      // stream will have surfaced that already; this request just fails.
      return handler.next(error);
    }

    // Marked before the retry so a second 401 falls straight through instead
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
