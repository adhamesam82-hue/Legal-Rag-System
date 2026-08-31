/// Build-time configuration.
///
/// Everything comes from `--dart-define`, not a checked-in file, so a debug
/// build pointed at a laptop and a release build pointed at production are the
/// same source.
library;

import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.organizationId,
    this.devAuth = false,
  });

  /// Base URL of the FastAPI backend, without a trailing slash.
  final String apiBaseUrl;

  /// Which firm's data this build talks to.
  ///
  /// Every practice route is nested under `/api/orgs/{id}/`, and a lawyer
  /// belongs to one firm in practice even though the backend allows several.
  /// Held here rather than discovered per screen so no screen can forget it
  /// and read another firm's rows; 0 means "ask the API which firms I am in",
  /// which is what a real sign-in will do once Clerk is wired.
  final int organizationId;

  /// Skip real sign-in and let the backend's LEGALOS_DEV_AUTH decide who the
  /// caller is.
  ///
  /// Both sides must agree: the API is what actually authenticates, and
  /// without LEGALOS_DEV_AUTH set there it rejects every request. This is what
  /// lets the screens be built before Clerk is wired -- see
  /// docs/lawyer-app-plan.md, which puts real sign-in last on purpose.
  final bool devAuth;

  factory AppConfig.fromEnvironment() => AppConfig(
    apiBaseUrl: const String.fromEnvironment('API_URL').isNotEmpty
        ? const String.fromEnvironment('API_URL')
        : defaultLocalBaseUrl(),
    organizationId: const int.fromEnvironment('ORG_ID', defaultValue: 0),
    devAuth: const bool.fromEnvironment('DEV_AUTH'),
  );

  /// Where the API is reachable FROM THE DEVICE, which is not always where it
  /// is reachable from the machine running it.
  ///
  /// The Android emulator does not share the host's loopback: 127.0.0.1 inside
  /// it is the emulator, and 10.0.2.2 is the host. Getting this wrong presents
  /// as a connection refused that looks like a dead server.
  static String defaultLocalBaseUrl() {
    if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:8000';
    // 127.0.0.1 rather than localhost: uvicorn binds IPv4 by default, and on
    // Windows `localhost` resolves to ::1 first, which is then refused.
    return 'http://127.0.0.1:8000';
  }
}
