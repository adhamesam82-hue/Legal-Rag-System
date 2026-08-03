import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legalos_mobile/auth/auth_cubit.dart';
import 'package:legalos_mobile/auth/auth_gateway.dart';
import 'package:legalos_mobile/l10n/strings.dart';
import 'package:legalos_mobile/ui/sign_in_page.dart';

class _Gateway implements AuthGateway {
  _Gateway({this.apple = true, this.failWith});

  final bool apple;
  final AuthFailure? failWith;
  final _controller = StreamController<AppUser?>.broadcast();

  int googleCalls = 0;
  int appleCalls = 0;

  @override
  Stream<AppUser?> get changes => _controller.stream;

  @override
  AppUser? get currentUser => null;

  @override
  Future<String?> idToken({bool forceRefresh = false}) async => null;

  @override
  Future<void> signInWithGoogle() async {
    googleCalls++;
    if (failWith != null) throw failWith!;
  }

  @override
  Future<void> signInWithApple() async {
    appleCalls++;
    if (failWith != null) throw failWith!;
  }

  @override
  Future<void> signOut() async {}

  @override
  Future<bool> get appleAvailable async => apple;

  void dispose() => _controller.close();
}

Widget wrap(AuthCubit cubit, {Locale locale = const Locale('en')}) =>
    MaterialApp(
      locale: locale,
      supportedLocales: Strings.supported,
      // The same delegates the real app installs. Without them Material and
      // Cupertino have no Arabic strings and the widget tree throws under an
      // `ar` locale -- which is the app's default, so a test that skipped
      // these would only ever cover the secondary language.
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: BlocProvider.value(value: cubit, child: const SignInPage()),
    );

void main() {
  testWidgets('offers Apple and Google where Apple is available', (
    tester,
  ) async {
    final gateway = _Gateway();
    final cubit = AuthCubit(gateway);

    await tester.pumpWidget(wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Continue with Apple'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);

    await cubit.close();
    gateway.dispose();
  });

  testWidgets('hides Apple where it is not available', (tester) async {
    // Android without a Service ID configured. Showing a button that cannot
    // work is worse than not showing it.
    final gateway = _Gateway(apple: false);
    final cubit = AuthCubit(gateway);

    await tester.pumpWidget(wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Continue with Apple'), findsNothing);
    expect(find.text('Continue with Google'), findsOneWidget);

    await cubit.close();
    gateway.dispose();
  });

  testWidgets('offers no password field at all', (tester) async {
    // A password is a thing to store, reset, leak and support. Neither
    // provider needs one, so the app has none.
    final gateway = _Gateway();
    final cubit = AuthCubit(gateway);

    await tester.pumpWidget(wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsNothing);

    await cubit.close();
    gateway.dispose();
  });

  testWidgets('tapping a provider starts that sign-in', (tester) async {
    final gateway = _Gateway();
    final cubit = AuthCubit(gateway);

    await tester.pumpWidget(wrap(cubit));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Continue with Google'));
    await tester.pump();

    expect(gateway.googleCalls, 1);
    expect(gateway.appleCalls, 0);

    await cubit.close();
    gateway.dispose();
  });

  testWidgets('a cancelled sign-in shows no error banner', (tester) async {
    final gateway = _Gateway(
      failWith: const AuthFailure('Sign-in cancelled', cancelled: true),
    );
    final cubit = AuthCubit(gateway);

    await tester.pumpWidget(wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.error_outline), findsNothing);

    await cubit.close();
    gateway.dispose();
  });

  testWidgets('a real failure is shown', (tester) async {
    final gateway = _Gateway(
      failWith: const AuthFailure('No connection. Check your network.'),
    );
    final cubit = AuthCubit(gateway);

    await tester.pumpWidget(wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    expect(find.text('No connection. Check your network.'), findsOneWidget);

    await cubit.close();
    gateway.dispose();
  });

  testWidgets('renders in Arabic', (tester) async {
    final gateway = _Gateway();
    final cubit = AuthCubit(gateway);

    await tester.pumpWidget(wrap(cubit, locale: const Locale('ar')));
    await tester.pumpAndSettle();

    expect(find.text('المتابعة عبر Google'), findsOneWidget);
    expect(find.text('المساعد الذكي'), findsOneWidget);

    await cubit.close();
    gateway.dispose();
  });
}
