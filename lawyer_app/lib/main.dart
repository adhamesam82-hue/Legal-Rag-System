import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'auth/auth_gateway.dart';
import 'core/api_client.dart';
import 'core/config.dart';
import 'core/theme.dart';
import 'data/practice_repository.dart';
import 'ui/documents_page.dart';
import 'ui/hearings_page.dart';
import 'ui/matters_page.dart';
import 'ui/today_page.dart';

void main() {
  final config = AppConfig.fromEnvironment();
  // One gateway today. When the Clerk browser flow lands it is swapped here
  // and nowhere else -- api_client.dart depends on the interface, not on this.
  final AuthGateway gateway = const DevAuthGateway();
  final repository = PracticeRepository(
    buildApiClient(config, gateway),
    // 1 is the seeded firm, and the right default only while sign-in is
    // dev-auth. Real sign-in reads it from the membership.
    config.organizationId == 0 ? 1 : config.organizationId,
  );
  runApp(LawyerApp(repository: repository));
}

class LawyerApp extends StatelessWidget {
  const LawyerApp({super.key, required this.repository});

  final PracticeRepository repository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'alsigil',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      // Arabic is not a setting here, it is the product. Pinned rather than
      // taken from the device so the app cannot render half-English on a
      // handset set to English -- and so date formatting is the same on every
      // device, which is exactly what the web app's calendar got wrong.
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Home(repository: repository),
    );
  }
}

class Home extends StatefulWidget {
  const Home({super.key, required this.repository});

  final PracticeRepository repository;

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      TodayPage(repository: widget.repository),
      HearingsPage(repository: widget.repository),
      MattersPage(repository: widget.repository),
      DocumentsPage(repository: widget.repository),
    ];

    return Scaffold(
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (index) => setState(() => _tab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today), label: 'يومي'),
          NavigationDestination(icon: Icon(Icons.gavel), label: 'الجلسات'),
          NavigationDestination(icon: Icon(Icons.folder_outlined), label: 'القضايا'),
          NavigationDestination(
            icon: Icon(Icons.description_outlined),
            label: 'المستندات',
          ),
        ],
      ),
    );
  }
}
