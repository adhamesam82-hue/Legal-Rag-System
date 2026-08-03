import 'package:flutter/material.dart';

/// Colours and type, taken from the web app's tokens (web/lib/legalos.css) so
/// the two products are recognisably one brand rather than two green apps.
class LegalColors {
  const LegalColors._();

  static const accentLight = Color(0xFF006E4A);
  static const accentDark = Color(0xFF5DDCAD);

  static const bodyLight = Color(0xFFFAFAFA);
  static const bodyDark = Color(0xFF0C0C0D);

  static const surfaceLight = Color(0xFFFFFFFF);
  static const surfaceDark = Color(0xFF151516);

  static const textPrimaryLight = Color(0xFF18181B);
  static const textPrimaryDark = Color(0xFFEDEDED);

  static const textSecondaryLight = Color(0xFF71717A);
  static const textSecondaryDark = Color(0xFFA1A1AA);

  static const errorLight = Color(0xFFA50C25);
  static const errorDark = Color(0xFFFFC6C1);

  static const warningLight = Color(0xFF745B00);
  static const warningDark = Color(0xFFFDCF4F);
}

ThemeData buildTheme({required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;

  final accent = isDark ? LegalColors.accentDark : LegalColors.accentLight;
  final body = isDark ? LegalColors.bodyDark : LegalColors.bodyLight;
  final surface = isDark ? LegalColors.surfaceDark : LegalColors.surfaceLight;
  final primaryText = isDark
      ? LegalColors.textPrimaryDark
      : LegalColors.textPrimaryLight;
  final secondaryText = isDark
      ? LegalColors.textSecondaryDark
      : LegalColors.textSecondaryLight;

  final scheme =
      ColorScheme.fromSeed(
        seedColor: LegalColors.accentLight,
        brightness: brightness,
      ).copyWith(
        primary: accent,
        onPrimary: isDark ? const Color(0xFF003D1D) : Colors.white,
        surface: surface,
        onSurface: primaryText,
        error: isDark ? LegalColors.errorDark : LegalColors.errorLight,
      );

  // Arabic legal text is dense and long; the default Material line height
  // makes a wall of it. 1.6 on body styles is what stops an answer reading as
  // one block, in both scripts.
  TextStyle body16(Color color) =>
      TextStyle(fontSize: 16, height: 1.6, color: color);

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: body,
    // Falls back to the platform's own Arabic face (Geeza Pro on iOS, Noto
    // Naskh on Android) rather than shipping a font that may not cover the
    // Arabic-Indic digits the corpus contains.
    fontFamilyFallback: const ['Geeza Pro', 'Noto Naskh Arabic', 'Arial'],
    textTheme: TextTheme(
      headlineMedium: TextStyle(
        fontSize: 26,
        height: 1.3,
        fontWeight: FontWeight.w600,
        color: primaryText,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: primaryText,
      ),
      bodyLarge: body16(primaryText),
      bodyMedium: TextStyle(fontSize: 14, height: 1.55, color: primaryText),
      bodySmall: TextStyle(fontSize: 12.5, height: 1.45, color: secondaryText),
      labelLarge: TextStyle(
        fontSize: 13.5,
        fontWeight: FontWeight.w600,
        color: primaryText,
      ),
    ),
    dividerColor: isDark ? const Color(0x14FFFFFF) : const Color(0x1418181B),
    appBarTheme: AppBarTheme(
      backgroundColor: body,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: primaryText,
      ),
      iconTheme: IconThemeData(color: primaryText),
    ),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? const Color(0x14FFFFFF) : const Color(0x1418181B),
        ),
      ),
    ),
  );
}
