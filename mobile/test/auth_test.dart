import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legalos_mobile/auth/auth_cubit.dart';
import 'package:legalos_mobile/auth/auth_gateway.dart';
import 'package:legalos_mobile/core/api_client.dart';
import 'package:legalos_mobile/core/config.dart';

const _user = AppUser(id: 'uid_1', displayName: 'Test', email: 't@example.com');

/// A gateway whose behaviour each test dictates. Fakes over mocks: what is
/// being tested is how the app reacts to a provider, and a hand-written fake
/// states the provider's contract readably.
class FakeGateway implements AuthGateway {
  FakeGateway({
    this.tokens = const ['token-1'],
    this.failWith,
    this.apple = true,
    this.gate,
  });

  /// When set, sign-in blocks until completed — lets a test act while the
  /// attempt is genuinely still in flight.
  final Completer<void>? gate;

  /// Returned by successive idToken() calls; the last value repeats.
  final List<String?> tokens;
  final AuthFailure? failWith;
  final bool apple;

  final _controller = StreamController<AppUser?>.broadcast();
  AppUser? _current;
  int tokenCalls = 0;
  int forcedRefreshes = 0;
  int signOutCalls = 0;

  @override
  Stream<AppUser?> get changes => _controller.stream;

  @override
  AppUser? get currentUser => _current;

  void emit(AppUser? user) {
    _current = user;
    _controller.add(user);
  }

  @override
  Future<String?> idToken({bool forceRefresh = false}) async {
    if (forceRefresh) forcedRefreshes++;
    final token = tokens[tokenCalls.clamp(0, tokens.length - 1)];
    tokenCalls++;
    return token;
  }

  @override
  Future<void> signInWithGoogle() async {
    if (failWith != null) throw failWith!;
    await gate?.future;
    emit(_user);
  }

  @override
  Future<void> signInWithApple() async {
    if (failWith != null) throw failWith!;
    await gate?.future;
    emit(_user);
  }

  @override
  Future<void> signOut() async {
    signOutCalls++;
    emit(null);
  }

  @override
  Future<bool> get appleAvailable async => apple;

  void dispose() => _controller.close();
}

void main() {
  group('AuthCubit', () {
    test('starts unknown, not signed out', () {
      // The difference matters: signed-out shows the sign-in screen, and
      // showing it before the provider has answered would ask an already
      // signed-in user to sign in and then yank it away.
      final gateway = FakeGateway();
      final cubit = AuthCubit(gateway);

      expect(cubit.state, isA<AuthUnknown>());

      cubit.close();
      gateway.dispose();
    });

    test('a signed-in user from the provider stream becomes AuthSignedIn', () async {
      final gateway = FakeGateway();
      final cubit = AuthCubit(gateway);

      gateway.emit(_user);
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state, isA<AuthSignedIn>());
      expect((cubit.state as AuthSignedIn).user.id, 'uid_1');

      await cubit.close();
      gateway.dispose();
    });

    test('signing in passes through AuthSigningIn', () async {
      final gateway = FakeGateway();
      final cubit = AuthCubit(gateway);
      final seen = <AuthState>[];
      final subscription = cubit.stream.listen(seen.add);

      await cubit.signInWithGoogle();
      await Future<void>.delayed(Duration.zero);

      expect(seen.whereType<AuthSigningIn>(), isNotEmpty);
      expect(cubit.state, isA<AuthSignedIn>());

      await subscription.cancel();
      await cubit.close();
      gateway.dispose();
    });

    test('a cancelled sign-in shows no error', () async {
      // Backing out of Apple's sheet is a decision, not a failure. A red
      // banner for it reads as "something broke".
      final gateway = FakeGateway(
        failWith: const AuthFailure('Sign-in cancelled', cancelled: true),
      );
      final cubit = AuthCubit(gateway);

      await cubit.signInWithApple();

      expect(cubit.state, isA<AuthSignedOut>());
      expect((cubit.state as AuthSignedOut).error, isNull);

      await cubit.close();
      gateway.dispose();
    });

    test('a real sign-in failure surfaces its message', () async {
      final gateway = FakeGateway(
        failWith: const AuthFailure('No connection. Check your network.'),
      );
      final cubit = AuthCubit(gateway);

      await cubit.signInWithGoogle();

      expect(
        (cubit.state as AuthSignedOut).error,
        'No connection. Check your network.',
      );

      await cubit.close();
      gateway.dispose();
    });

    test('signing out clears the session', () async {
      final gateway = FakeGateway();
      final cubit = AuthCubit(gateway);
      gateway.emit(_user);
      await Future<void>.delayed(Duration.zero);

      await cubit.signOut();

      expect(cubit.state, isA<AuthSignedOut>());
      expect(gateway.signOutCalls, 1);

      await cubit.close();
      gateway.dispose();
    });

    test('a null from the stream mid-sign-in does not bounce the UI back', () async {
      // Some provider flows emit a transient null while the attempt is still
      // in flight. Acting on it would throw the user back to the sign-in
      // screen part-way through their own sign-in.
      final gateway = FakeGateway(gate: Completer<void>());
      final cubit = AuthCubit(gateway);

      final pending = cubit.signInWithGoogle();
      await Future<void>.delayed(Duration.zero);
      gateway.emit(null);
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state, isA<AuthSigningIn>());

      gateway.gate!.complete();
      await pending;
      await Future<void>.delayed(Duration.zero);
      expect(cubit.state, isA<AuthSignedIn>());

      await cubit.close();
      gateway.dispose();
    });

    test('a null after sign-in does sign the user out', () async {
      // The other side of the guard above: once signed in, a null is a real
      // sign-out (token revoked, account deleted) and must be honoured.
      final gateway = FakeGateway();
      final cubit = AuthCubit(gateway);
      gateway.emit(_user);
      await Future<void>.delayed(Duration.zero);

      gateway.emit(null);
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state, isA<AuthSignedOut>());

      await cubit.close();
      gateway.dispose();
    });
  });

  group('auth interceptor', () {
    late FakeGateway gateway;
    late Dio dio;
    late List<RequestOptions> received;

    void stubWith(int Function(int attempt) status) {
      received = [];
      var attempt = 0;
      dio.httpClientAdapter = _StubAdapter((options) {
        received.add(options);
        final code = status(attempt++);
        return ResponseBody.fromString(
          '{"ok": true}',
          code,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
    }

    setUp(() {
      gateway = FakeGateway(tokens: ['token-1', 'token-2']);
      dio = buildApiClient(
        const AppConfig(apiBaseUrl: 'http://localhost:9999'),
        gateway,
      );
    });

    tearDown(() => gateway.dispose());

    test('attaches the token as a bearer header', () async {
      stubWith((_) => 200);

      await dio.get<dynamic>('/api/conversations');

      expect(received.single.headers['Authorization'], 'Bearer token-1');
    });

    test('sends no Authorization header when there is no token', () async {
      gateway = FakeGateway(tokens: const [null]);
      dio = buildApiClient(
        const AppConfig(apiBaseUrl: 'http://localhost:9999'),
        gateway,
      );
      stubWith((_) => 200);

      await dio.get<dynamic>('/api/conversations');

      expect(received.single.headers.containsKey('Authorization'), isFalse);
    });

    test('a 401 forces one refresh and retries with the new token', () async {
      stubWith((attempt) => attempt == 0 ? 401 : 200);

      final response = await dio.get<dynamic>('/api/conversations');

      expect(response.statusCode, 200);
      expect(gateway.forcedRefreshes, 1);
      expect(received, hasLength(2));
      expect(received.last.headers['Authorization'], 'Bearer token-2');
    });

    test('a second 401 is not retried again', () async {
      // Otherwise a server that will never accept us produces an infinite
      // refresh loop instead of an error the user can see.
      stubWith((_) => 401);

      await expectLater(
        dio.get<dynamic>('/api/conversations'),
        throwsA(isA<DioException>()),
      );

      expect(gateway.forcedRefreshes, 1);
      expect(received, hasLength(2));
    });

    test('a non-401 error is not retried', () async {
      stubWith((_) => 500);

      await expectLater(
        dio.get<dynamic>('/api/conversations'),
        throwsA(isA<DioException>()),
      );

      expect(gateway.forcedRefreshes, 0);
      expect(received, hasLength(1));
    });

    test('a 401 with no token available fails instead of looping', () async {
      gateway = FakeGateway(tokens: const [null]);
      dio = buildApiClient(
        const AppConfig(apiBaseUrl: 'http://localhost:9999'),
        gateway,
      );
      stubWith((_) => 401);

      await expectLater(
        dio.get<dynamic>('/api/conversations'),
        throwsA(isA<DioException>()),
      );

      expect(received, hasLength(1));
    });
  });
}

/// Answers requests from a callback instead of the network.
class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.respond);

  final ResponseBody Function(RequestOptions options) respond;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => respond(options);

  @override
  void close({bool force = false}) {}
}
