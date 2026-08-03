/// Build-time configuration.
///
/// Everything here comes from `--dart-define`, not from a checked-in file, so
/// a debug build pointed at a laptop and a release build pointed at production
/// are the same source.
library;

import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

class AppConfig {
  const AppConfig({required this.apiBaseUrl, this.devAuth = false});

  /// Base URL of the FastAPI backend, without a trailing slash.
  final String apiBaseUrl;

  /// Skip Firebase entirely and let the backend's LEGALOS_DEV_AUTH decide who
  /// the caller is.
  ///
  /// For running the whole stack locally before a Firebase project exists.
  /// Both sides must agree: the API is what actually authenticates, and
  /// without LEGALOS_DEV_AUTH set there it will simply reject every request.
  final bool devAuth;

  factory AppConfig.fromEnvironment() => AppConfig(
    apiBaseUrl: const String.fromEnvironment('API_URL').isNotEmpty
        ? const String.fromEnvironment('API_URL')
        : defaultLocalBaseUrl(),
    devAuth: const bool.fromEnvironment('DEV_AUTH'),
  );

  /// Where `uv run uvicorn legalrag.api:app` is reachable from the device.
  ///
  /// The Android emulator does not share the host's loopback: 127.0.0.1 inside
  /// it is the emulator itself and 10.0.2.2 is the host. Getting this wrong
  /// presents as a connection refused that looks like a dead server.
  static String defaultLocalBaseUrl() {
    if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:8000';
    return 'http://localhost:8000';
  }
}
