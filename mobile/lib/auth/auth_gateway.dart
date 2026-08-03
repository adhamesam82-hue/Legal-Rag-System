import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:equatable/equatable.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

class AppUser extends Equatable {
  const AppUser({
    required this.id,
    this.displayName,
    this.email,
    this.photoUrl,
  });

  final String id;
  final String? displayName;
  final String? email;
  final String? photoUrl;

  @override
  List<Object?> get props => [id, displayName, email, photoUrl];
}

/// Raised when sign-in fails for a reason worth telling the user about.
class AuthFailure implements Exception {
  const AuthFailure(this.message, {this.cancelled = false});

  final String message;

  /// The user backed out of the provider sheet. Not an error — the UI should
  /// return to the sign-in screen silently rather than show a red banner.
  final bool cancelled;

  @override
  String toString() => message;
}

/// What the app needs from an identity provider.
///
/// An interface rather than a direct dependency on FirebaseAuth for two
/// reasons: the API-client interceptor and the auth cubit can then be tested
/// without a Firebase project, and the local dev mode below can stand in for
/// the whole thing.
abstract interface class AuthGateway {
  /// Emits on sign-in, sign-out, and token refresh. Null means signed out.
  Stream<AppUser?> get changes;

  AppUser? get currentUser;

  /// A bearer token for the API, or null when signed out.
  ///
  /// [forceRefresh] bypasses the cached token; used after a 401, where the
  /// server has rejected what we hold.
  Future<String?> idToken({bool forceRefresh = false});

  Future<void> signInWithGoogle();

  Future<void> signInWithApple();

  Future<void> signOut();

  /// Whether Sign in with Apple can run on this device.
  Future<bool> get appleAvailable;
}

class FirebaseAuthGateway implements AuthGateway {
  FirebaseAuthGateway({FirebaseAuth? auth, GoogleSignIn? google})
    : _auth = auth ?? FirebaseAuth.instance,
      _google = google ?? GoogleSignIn();

  final FirebaseAuth _auth;
  final GoogleSignIn _google;

  @override
  Stream<AppUser?> get changes => _auth.idTokenChanges().map(_toAppUser);

  @override
  AppUser? get currentUser => _toAppUser(_auth.currentUser);

  static AppUser? _toAppUser(User? user) => user == null
      ? null
      : AppUser(
          id: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoUrl: user.photoURL,
        );

  @override
  Future<String?> idToken({bool forceRefresh = false}) async {
    final user = _auth.currentUser;
    if (user == null) return null;
    try {
      // Firebase ID tokens last an hour; the SDK refreshes them on its own, so
      // this is normally a cache read.
      return await user.getIdToken(forceRefresh);
    } on FirebaseAuthException {
      // The account was disabled or the token revoked while we held it. There
      // is no valid token to return, and pretending otherwise would send a
      // request that can only 401.
      return null;
    }
  }

  @override
  Future<void> signInWithGoogle() async {
    try {
      final account = await _google.signIn();
      if (account == null) {
        throw const AuthFailure('Sign-in cancelled', cancelled: true);
      }
      final authentication = await account.authentication;
      await _auth.signInWithCredential(
        GoogleAuthProvider.credential(
          accessToken: authentication.accessToken,
          idToken: authentication.idToken,
        ),
      );
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_readable(error));
    }
  }

  @override
  Future<void> signInWithApple() async {
    // Apple receives the SHA-256 hash and Firebase the raw value. Firebase
    // hashes what we give it and compares, which proves the credential was
    // minted for this sign-in attempt and not replayed from another.
    final rawNonce = _randomNonce();
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: sha256.convert(utf8.encode(rawNonce)).toString(),
      );

      await _auth.signInWithCredential(
        OAuthProvider('apple.com').credential(
          idToken: credential.identityToken,
          rawNonce: rawNonce,
        ),
      );
    } on SignInWithAppleAuthorizationException catch (error) {
      if (error.code == AuthorizationErrorCode.canceled) {
        throw const AuthFailure('Sign-in cancelled', cancelled: true);
      }
      throw AuthFailure(error.message);
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_readable(error));
    }
  }

  @override
  Future<void> signOut() async {
    // Both, and in this order. Signing out of Firebase alone leaves Google's
    // account picker pre-answered, so "sign out" followed by "sign in" silently
    // returns to the same account with no way to choose another.
    await _google.signOut();
    await _auth.signOut();
  }

  @override
  Future<bool> get appleAvailable async {
    if (kIsWeb) return false;
    // Native on Apple platforms. Elsewhere it needs a Service ID and redirect
    // URI configured, which this app does not ship.
    if (Platform.isIOS || Platform.isMacOS) return true;
    return false;
  }

  static String _randomNonce([int length = 32]) {
    const characters =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(
      length,
      (_) => characters[random.nextInt(characters.length)],
    ).join();
  }

  static String _readable(FirebaseAuthException error) => switch (error.code) {
    'account-exists-with-different-credential' =>
      'This email is already signed up with a different provider.',
    'network-request-failed' => 'No connection. Check your network and retry.',
    'user-disabled' => 'This account has been disabled.',
    _ => error.message ?? 'Sign-in failed. Please try again.',
  };
}

/// Stands in for a provider when Firebase is not configured.
///
/// Mirrors the backend's LEGALOS_DEV_AUTH and the web app's USING_DEV_AUTH:
/// the API is what actually decides who the caller is, and with that variable
/// set it accepts unauthenticated requests as one fixed user. This lets the
/// app run end to end before a Firebase project exists.
///
/// It reports a signed-in user and returns no token, which is exactly what it
/// is — not a pretend sign-in screen.
class DevAuthGateway implements AuthGateway {
  DevAuthGateway({this.userId = 'dev-user'});

  final String userId;

  @override
  Stream<AppUser?> get changes => Stream.value(currentUser);

  @override
  AppUser? get currentUser => AppUser(id: userId, displayName: 'Local dev');

  @override
  Future<String?> idToken({bool forceRefresh = false}) async => null;

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signInWithApple() async {}

  @override
  Future<void> signOut() async {}

  @override
  Future<bool> get appleAvailable async => false;
}
