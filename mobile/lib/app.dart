import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'auth/auth_cubit.dart';
import 'auth/auth_gateway.dart';
import 'blocs/chat_bloc.dart';
import 'core/api_client.dart';
import 'core/config.dart';
import 'core/theme.dart';
import 'data/assistant_repository.dart';
import 'l10n/strings.dart';
import 'ui/chat_page.dart';
import 'ui/conversations_page.dart';
import 'ui/sign_in_page.dart';

/// The app's language.
///
/// Arabic by default: the corpus is Arabic statute text, the questions this is
/// built for are asked in Arabic, and defaulting to English would make the
/// primary audience switch languages before they can start.
class LocaleCubit extends Cubit<Locale> {
  LocaleCubit() : super(const Locale('ar'));

  void toggle() =>
      emit(state.languageCode == 'ar' ? const Locale('en') : const Locale('ar'));
}

class LegalOsApp extends StatelessWidget {
  const LegalOsApp({super.key, required this.config, required this.gateway});

  final AppConfig config;
  final AuthGateway gateway;

  @override
  Widget build(BuildContext context) {
    // One Dio, and it reads the token from the gateway per request rather than
    // being handed one at construction — an ID token lives an hour, so
    // anything captured here would be stale within the session.
    final repository = AssistantRepository(buildApiClient(config, gateway));

    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => LocaleCubit()),
        BlocProvider(create: (_) => AuthCubit(gateway)),
        BlocProvider(create: (_) => ChatBloc(repository)),
        BlocProvider(create: (_) => ConversationsCubit(repository)),
      ],
      child: BlocBuilder<LocaleCubit, Locale>(
        builder: (context, locale) => MaterialApp(
          title: 'LegalOS',
          debugShowCheckedModeBanner: false,
          locale: locale,
          supportedLocales: Strings.supported,
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: buildTheme(brightness: Brightness.light),
          darkTheme: buildTheme(brightness: Brightness.dark),
          themeMode: ThemeMode.system,
          home: const _AuthGate(),
          routes: {'/history': (_) => const ConversationsPage()},
        ),
      ),
    );
  }
}

/// Chooses the chat or the sign-in screen from the auth state.
///
/// A rebuild rather than a route redirect: there are two destinations and one
/// condition, and a signed-out user must not be able to navigate back into a
/// thread. Rebuilding removes the chat from the tree entirely; a redirect
/// would leave it behind the sign-in screen holding someone's conversation.
class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) =>
      BlocBuilder<AuthCubit, AuthState>(
        builder: (context, state) => switch (state) {
          // Firebase restores a persisted session asynchronously. Showing the
          // sign-in screen during that window would ask an already-signed-in
          // user to sign in, then yank it away.
          AuthUnknown() => const _Splash(),
          AuthSignedOut() || AuthSigningIn() => const SignInPage(),
          AuthSignedIn() => const ChatPage(),
        },
      );
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Icon(
        Icons.balance,
        size: 40,
        color: Theme.of(context).colorScheme.primary,
      ),
    ),
  );
}
