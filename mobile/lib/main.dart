import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app.dart';
import 'auth/auth_gateway.dart';
import 'core/config.dart';

/// Run against a local backend, before a Firebase project exists:
///
///   LEGALOS_DEV_AUTH=user_local uv run uvicorn legalrag.api:app --port 8000
///   flutter run --dart-define=API_URL=http://localhost:8000 --dart-define=DEV_AUTH=true
///
/// Run for real (needs android/app/google-services.json and
/// ios/Runner/GoogleService-Info.plist from the Firebase console):
///
///   flutter run --dart-define=API_URL=https://api.example.com
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();

  if (config.devAuth) {
    runApp(LegalOsApp(config: config, gateway: DevAuthGateway()));
    return;
  }

  try {
    // No generated firebase_options.dart: initializeApp() reads the native
    // config each platform already needs (google-services.json on Android,
    // GoogleService-Info.plist on Apple), so there is one source of truth for
    // the project rather than two that can disagree.
    await Firebase.initializeApp();
  } catch (error) {
    // Deliberately not falling back to dev mode. A release build with missing
    // Firebase config would then run with no sign-in at all and look fine
    // until every API call 401s — a misconfiguration must be loud.
    runApp(_ConfigurationError(error: error.toString()));
    return;
  }

  runApp(LegalOsApp(config: config, gateway: FirebaseAuthGateway()));
}

class _ConfigurationError extends StatelessWidget {
  const _ConfigurationError({required this.error});

  final String error;

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    home: Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.settings_ethernet, size: 40),
              const SizedBox(height: 16),
              const Text(
                'Firebase is not configured',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),
              const Text(
                'Add google-services.json (Android) and '
                'GoogleService-Info.plist (iOS) from the Firebase console, or '
                'run with --dart-define=DEV_AUTH=true against a backend '
                'started with LEGALOS_DEV_AUTH.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                error,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
