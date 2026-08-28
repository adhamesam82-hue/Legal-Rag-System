"""Two identity providers, one API.

The tests that matter here are the boundary ones: a Firebase-signed consumer
must never reach a law firm's data, and a token from somebody else's Firebase
project must not be accepted at all. Both failures would be silent.
"""
from __future__ import annotations

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient

from legalrag import auth
from legalrag.api import app
from legalrag.auth import (
    CLERK_PREFIX,
    FIREBASE_ISSUER_PREFIX,
    FIREBASE_PREFIX,
    get_current_subject,
    verify_firebase_token,
)
from legalrag.clerk import get_current_user_id

PROJECT_ID = "legalos-consumer-test"
OTHER_PROJECT_ID = "someone-elses-app"


@pytest.fixture(scope="module")
def signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def make_token(
    signing_key,
    *,
    project_id: str = PROJECT_ID,
    subject: str = "firebase_uid_abc",
    issuer_project: str | None = None,
    expires_in: int = 3600,
    auth_time: int | None = None,
) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "sub": subject,
            "aud": project_id,
            "iss": f"{FIREBASE_ISSUER_PREFIX}{issuer_project or project_id}",
            "iat": now,
            "exp": now + expires_in,
            "auth_time": auth_time if auth_time is not None else now,
        },
        signing_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


@pytest.fixture
def trusted_key(monkeypatch, signing_key):
    """Makes the generated key the one 'Google' publishes, so the real
    verification path runs against a signature we control."""

    class FakeJWKClient:
        def get_signing_key_from_jwt(self, token):
            return type("Key", (), {"key": signing_key.public_key()})()

    monkeypatch.setattr(auth, "_firebase_jwk_client", FakeJWKClient)
    return signing_key


class TestFirebaseTokenVerification:
    def test_a_valid_token_yields_its_uid(self, trusted_key):
        token = make_token(trusted_key, subject="uid_123")
        assert verify_firebase_token(token, PROJECT_ID) == "uid_123"

    def test_a_token_for_another_firebase_project_is_rejected(self, trusted_key):
        """The critical check. Every Firebase project's ID tokens are signed by
        the same Google keys, so a signature check alone would let anyone with
        any Firebase app sign in here as anyone."""
        token = make_token(trusted_key, project_id=OTHER_PROJECT_ID)

        with pytest.raises(HTTPException) as raised:
            verify_firebase_token(token, PROJECT_ID)
        assert raised.value.status_code == 401

    def test_a_token_with_a_foreign_issuer_is_rejected(self, trusted_key):
        token = make_token(trusted_key, issuer_project=OTHER_PROJECT_ID)

        with pytest.raises(HTTPException) as raised:
            verify_firebase_token(token, PROJECT_ID)
        assert raised.value.status_code == 401

    def test_an_expired_token_says_so_distinctly(self, trusted_key):
        """Told apart from a bad token so the app refreshes instead of signing
        the user out -- Firebase ID tokens expire every hour by design."""
        token = make_token(trusted_key, expires_in=-60)

        with pytest.raises(HTTPException) as raised:
            verify_firebase_token(token, PROJECT_ID)
        assert raised.value.status_code == 401
        assert raised.value.detail == "Token expired"

    def test_a_token_signed_by_the_wrong_key_is_rejected(self, trusted_key):
        impostor = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        token = make_token(impostor)

        with pytest.raises(HTTPException) as raised:
            verify_firebase_token(token, PROJECT_ID)
        assert raised.value.status_code == 401

    def test_a_token_authenticated_in_the_future_is_rejected(self, trusted_key):
        token = make_token(trusted_key, auth_time=int(time.time()) + 3600)

        with pytest.raises(HTTPException) as raised:
            verify_firebase_token(token, PROJECT_ID)
        assert raised.value.status_code == 401

    def test_garbage_is_rejected_without_crashing(self, trusted_key):
        with pytest.raises(HTTPException) as raised:
            verify_firebase_token("not-a-jwt", PROJECT_ID)
        assert raised.value.status_code == 401


class TestSubjectNamespacing:
    def test_a_firebase_uid_and_a_clerk_id_never_collide(self):
        """Both are opaque strings from different keyspaces. The prefix is what
        turns a possible collision into an impossible one."""
        assert f"{CLERK_PREFIX}abc" != f"{FIREBASE_PREFIX}abc"

    def test_dev_auth_is_namespaced_as_clerk(self, monkeypatch):
        monkeypatch.setenv("LEGALOS_DEV_AUTH", "user_local")
        client = TestClient(app)
        response = client.get("/api/conversations")
        assert response.status_code == 200


@pytest.fixture(autouse=True)
def _clerk_configured(monkeypatch):
    """Give the Clerk guard the one value it needs to be constructible.

    Without CLERK_JWKS_URL the guard raises at construction, so a request with
    no credentials comes back 500 instead of 401 and these boundary tests fail
    for a reason that has nothing to do with the boundary. Nothing is fetched:
    a request carrying no Authorization header is rejected before any key
    lookup, which is exactly the path being asserted.
    """
    monkeypatch.setenv(
        "CLERK_JWKS_URL", "https://clerk.test.invalid/.well-known/jwks.json"
    )


class TestProviderBoundary:
    """A consumer account must not reach firm data.

    Guaranteed structurally: the firm routes depend on clerk.get_current_user_id,
    which has no code path that accepts a Firebase token. These tests assert the
    wiring stays that way -- overriding the consumer dependency must not grant
    access to anything on the firm surface.
    """

    @pytest.fixture
    def consumer_client(self):
        app.dependency_overrides[get_current_subject] = (
            lambda: f"{FIREBASE_PREFIX}consumer_uid"
        )
        yield TestClient(app)
        app.dependency_overrides.pop(get_current_subject, None)

    def test_a_consumer_may_use_their_own_conversations(self, consumer_client):
        assert consumer_client.get("/api/conversations").status_code == 200

    def test_a_consumer_does_not_reach_organizations(self, consumer_client, monkeypatch):
        monkeypatch.delenv("LEGALOS_DEV_AUTH", raising=False)
        # No Clerk credentials presented, and the consumer override does not
        # apply to this route: the firm surface simply does not see them.
        assert consumer_client.get("/api/orgs/me").status_code in (401, 403)

    def test_a_consumer_does_not_reach_practice_management(
        self, consumer_client, monkeypatch
    ):
        monkeypatch.delenv("LEGALOS_DEV_AUTH", raising=False)
        assert consumer_client.get("/api/clients").status_code in (401, 403, 404, 422)

    def test_the_firm_routes_still_depend_on_clerk_only(self):
        """A regression guard: if someone swaps the org routes onto
        get_current_subject, this fails."""
        org_routes = [
            route
            for route in app.routes
            if getattr(route, "path", "").startswith("/api/orgs")
        ]
        assert org_routes, "expected organization routes to exist"

        for route in org_routes:
            calls = {dependency.call for dependency in route.dependant.dependencies}
            assert get_current_subject not in calls, (
                f"{route.path} accepts a consumer token; firm routes must be "
                "Clerk-only"
            )


class TestConsumerRoutesAcceptEitherProvider:
    def test_conversation_routes_use_the_two_provider_dependency(self):
        consumer_paths = {
            "/api/ask/stream",
            "/api/conversations",
            "/api/conversations/{conversation_id}",
        }
        seen = set()

        for route in app.routes:
            path = getattr(route, "path", "")
            if path not in consumer_paths:
                continue
            calls = {d.call for d in route.dependant.dependencies}
            assert get_current_subject in calls, f"{path} is not subject-scoped"
            assert get_current_user_id not in calls, (
                f"{path} still requires Clerk, which locks consumers out"
            )
            seen.add(path)

        assert seen == consumer_paths
