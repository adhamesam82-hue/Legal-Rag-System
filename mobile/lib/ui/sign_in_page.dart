import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../auth/auth_cubit.dart';
import '../l10n/strings.dart';

/// Sign in with Apple or Google.
///
/// No email/password field, on purpose: a password is a thing to store, reset,
/// leak and support, and neither provider needs one. Apple is listed first on
/// iOS because that is Apple's guidance, and last elsewhere.
class SignInPage extends StatelessWidget {
  const SignInPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final strings = Strings.of(context);

    return Scaffold(
      body: SafeArea(
        child: BlocBuilder<AuthCubit, AuthState>(
          builder: (context, state) {
            final busy = state is AuthSigningIn;
            final error = state is AuthSignedOut ? state.error : null;

            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(flex: 2),

                  Icon(
                    Icons.balance,
                    size: 44,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    strings.heading,
                    style: theme.textTheme.headlineMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    strings.subheading,
                    style: theme.textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),

                  const Spacer(flex: 3),

                  if (error != null) ...[
                    _ErrorNotice(message: error),
                    const SizedBox(height: 16),
                  ],

                  FutureBuilder<bool>(
                    future: context.read<AuthCubit>().appleAvailable,
                    builder: (context, snapshot) => Column(
                      children: [
                        if (snapshot.data ?? false) ...[
                          _ProviderButton(
                            icon: Icons.apple,
                            label: strings.continueWithApple,
                            filled: true,
                            enabled: !busy,
                            onPressed: () =>
                                context.read<AuthCubit>().signInWithApple(),
                          ),
                          const SizedBox(height: 12),
                        ],
                        _ProviderButton(
                          icon: Icons.g_mobiledata,
                          label: strings.continueWithGoogle,
                          filled: false,
                          enabled: !busy,
                          onPressed: () =>
                              context.read<AuthCubit>().signInWithGoogle(),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  if (busy)
                    const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  else
                    Text(
                      strings.signInFooter,
                      style: theme.textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),

                  const Spacer(),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ProviderButton extends StatelessWidget {
  const _ProviderButton({
    required this.icon,
    required this.label,
    required this.filled,
    required this.enabled,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final bool filled;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final foreground = filled
        ? theme.colorScheme.onPrimary
        : theme.colorScheme.onSurface;

    return SizedBox(
      height: 52,
      child: Material(
        color: filled ? theme.colorScheme.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: enabled ? onPressed : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: filled
                  ? null
                  : Border.all(color: theme.dividerColor, width: 1.4),
            ),
            child: Opacity(
              opacity: enabled ? 1 : 0.5,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 22, color: foreground),
                  const SizedBox(width: 10),
                  Text(
                    label,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: foreground,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorNotice extends StatelessWidget {
  const _ErrorNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, size: 18, color: theme.colorScheme.error),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }
}
