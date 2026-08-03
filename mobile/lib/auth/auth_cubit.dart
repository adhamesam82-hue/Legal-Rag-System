import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import 'auth_gateway.dart';

sealed class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Before the first answer from the provider. Distinct from signed-out so the
/// app shows a splash rather than flashing the sign-in screen at a user who
/// is in fact already signed in.
final class AuthUnknown extends AuthState {
  const AuthUnknown();
}

final class AuthSignedOut extends AuthState {
  const AuthSignedOut({this.error});

  /// A failure worth showing. Null after a cancelled attempt — backing out of
  /// Apple's sheet is a decision, not an error.
  final String? error;

  @override
  List<Object?> get props => [error];
}

final class AuthSigningIn extends AuthState {
  const AuthSigningIn();
}

final class AuthSignedIn extends AuthState {
  const AuthSignedIn(this.user);

  final AppUser user;

  @override
  List<Object?> get props => [user];
}

class AuthCubit extends Cubit<AuthState> {
  AuthCubit(this._gateway) : super(const AuthUnknown()) {
    _subscription = _gateway.changes.listen((user) {
      // Ignored while a sign-in is in flight: the provider emits an
      // intermediate null on some flows, which would bounce the UI back to the
      // sign-in screen mid-attempt.
      if (user == null && state is AuthSigningIn) return;
      emit(user == null ? const AuthSignedOut() : AuthSignedIn(user));
    });
  }

  final AuthGateway _gateway;
  late final StreamSubscription<AppUser?> _subscription;

  Future<bool> get appleAvailable => _gateway.appleAvailable;

  Future<void> signInWithGoogle() => _attempt(_gateway.signInWithGoogle);

  Future<void> signInWithApple() => _attempt(_gateway.signInWithApple);

  Future<void> _attempt(Future<void> Function() signIn) async {
    if (state is AuthSigningIn) return;
    emit(const AuthSigningIn());
    try {
      await signIn();
      // No emit on success: the changes stream delivers the signed-in user,
      // so emitting here would race it and could publish a user the gateway
      // has not actually settled on.
      final user = _gateway.currentUser;
      if (state is AuthSigningIn && user != null) {
        emit(AuthSignedIn(user));
      }
    } on AuthFailure catch (failure) {
      emit(AuthSignedOut(error: failure.cancelled ? null : failure.message));
    } catch (error) {
      emit(AuthSignedOut(error: error.toString()));
    }
  }

  Future<void> signOut() async {
    await _gateway.signOut();
    emit(const AuthSignedOut());
  }

  @override
  Future<void> close() {
    _subscription.cancel();
    return super.close();
  }
}
