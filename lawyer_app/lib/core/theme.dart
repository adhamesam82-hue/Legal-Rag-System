import 'package:flutter/material.dart';

/// Arabic-first and RTL from the first screen, not retrofitted.
///
/// The web app's green is carried over deliberately: a lawyer moving between
/// the desk and the phone should not feel they have opened a different
/// product.
const seedGreen = Color(0xFF0B6E4F);

/// Overdue is the one colour that must not be decorative.
const overdueRed = Color(0xFFB3261E);

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: seedGreen,
    brightness: Brightness.light,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: const Color(0xFFF7F7F5),
    // Cairo would be better and is a dependency this app does not have yet;
    // the platform's Arabic face is legible everywhere and costs nothing.
    fontFamily: null,
    appBarTheme: AppBarTheme(
      backgroundColor: scheme.surface,
      foregroundColor: scheme.onSurface,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    ),
  );
}
