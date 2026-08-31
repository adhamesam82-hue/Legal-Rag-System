/// Who the caller is, and the token that proves it.
///
/// An interface with one real implementation today. The shape is taken from
/// mobile/lib/auth/auth_gateway.dart, which is the right shape and the wrong
/// implementation -- that one is Firebase, and this app signs in law firms.
///
/// THE CLERK DECISION, WHICH IS ALREADY MADE
/// -----------------------------------------
/// The roadmap settles it: Clerk's Flutter SDK is community-maintained and
/// pre-1.0, so real sign-in goes through the browser
/// (`flutter_web_auth_2` -> Clerk hosted sign-in -> session token -> Bearer)
/// rather than depending on the SDK. That is why this is an interface with the
/// token behind an async call: the browser flow returns a token the same way,
/// and api_client.dart will not change when it lands.
///
/// Until then DevAuthGateway sends no token at all and the backend's
/// LEGALOS_DEV_AUTH decides. That is not a shortcut around auth -- the API
/// still decides who the caller is; it is how the screens get built before a
/// Clerk tenant exists, which is the order docs/lawyer-app-plan.md sets out.
library;

abstract class AuthGateway {
  /// The bearer token, or null when there is none to send.
  ///
  /// [forceRefresh] is asked for after a 401: the token we hold was rejected,
  /// and a fresh one usually resolves it.
  Future<String?> idToken({bool forceRefresh = false});

  /// Whether somebody is signed in.
  bool get isSignedIn;

  /// Ends the session.
  Future<void> signOut();
}

/// No token, no sign-in screen. The backend authenticates by LEGALOS_DEV_AUTH.
class DevAuthGateway implements AuthGateway {
  const DevAuthGateway();

  @override
  Future<String?> idToken({bool forceRefresh = false}) async => null;

  @override
  bool get isSignedIn => true;

  @override
  Future<void> signOut() async {}
}
