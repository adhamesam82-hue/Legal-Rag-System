"""Organizations and memberships.

Clerk owns identity (see clerk.py). This module owns who belongs to which
firm and in what role -- the one piece of tenant state everything else in
the SaaS phase (matters, clients, documents, billing) will hang off later.
"""
from __future__ import annotations

import string
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import psycopg
from psycopg.types.json import Jsonb

from legalrag.config import get_trial_days

ROLES = ("owner", "lawyer", "staff")

# --- subscription (0026, T-041) -----------------------------------------------
# 'trial' is the only plan anything writes today. The paid names are
# PROVISIONAL placeholders -- the owner has not decided the plans, their
# prices or their limits -- and nothing sets them until a payment gateway
# exists. Renaming them is a migration of the CHECK in 0026 plus this tuple.
PLANS = ("trial", "basic", "pro", "enterprise")
# What an owner may record as an intent on /plans. An intent, not a
# subscription: it changes nothing about what the firm can do.
PAID_PLANS = ("basic", "pro", "enterprise")

# --- the settings' closed lists (0025) ---------------------------------------
# Each is CHECKed in the database too; these are the API's copy, so a bad
# value is a 422 with a sentence rather than a 500 with a constraint name.

LOCALES = ("ar", "en")
DATE_FORMATS = ("DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY")
FIRM_SIZES = ("solo", "small", "medium", "large")
CLIENT_KINDS = ("individuals", "companies", "mixed")
# The design system's Badge/Token palette -- the same nine as document tags.
BRAND_COLORS = ("blue", "cyan", "green", "orange", "pink", "purple", "red", "teal", "yellow")

# What a firm may declare mandatory on its own forms. Only fields that are
# optional in the API can be listed: name and client are required already,
# and a key outside this map is refused so the JSON never becomes a dump.
REQUIRED_FIELD_CHOICES: dict[str, tuple[str, ...]] = {
    "matter": ("matter_number", "description", "budget_amount", "tags", "staff"),
    "client": (
        "industry", "client_since", "registration_number", "tax_id",
        "address", "phone", "email", "notes",
    ),
}


class LastOwnerError(Exception):
    """Raised when an operation would leave an organization with no Owner."""


@dataclass(frozen=True)
class Organization:
    id: int
    name: str
    created_by: str
    # The firm's own details, as shown on /settings and printed on invoices.
    # All optional: an organization is created with a name and nothing else.
    registration_number: str | None = None
    phone: str | None = None
    address: str | None = None
    logo_url: str | None = None
    # What the firm practises: any subset of the matter-type list. Empty until
    # the owner picks some on /settings; never NULL, so callers can iterate.
    specialties: tuple[str, ...] = ()
    # --- 0025: the rest of /settings. Nullable unless it has a default.
    governorate: str | None = None
    main_court: str | None = None
    firm_size: str | None = None
    client_kind: str | None = None
    legal_name: str | None = None
    tax_id: str | None = None
    bar_number: str | None = None
    website: str | None = None
    brand_color: str | None = None
    locale: str = "ar"
    timezone: str = "Africa/Cairo"
    date_format: str = "DD/MM/YYYY"
    default_currency: str = "EGP"
    # NULL = the built-in INV-{year}-{seq}; see billing.next_invoice_number.
    invoice_number_pattern: str | None = None
    # A preference that pre-fills new invoices. Never read when printing:
    # every invoice stores its own rate (0012).
    default_tax_rate: Decimal = Decimal(0)
    default_payment_terms_days: int = 30
    # {"matter": [...], "client": [...]} over REQUIRED_FIELD_CHOICES.
    required_fields: dict[str, list[str]] = field(default_factory=dict)
    # --- 0026 (T-041). The trial is real; the paid plans are not yet.
    plan: str = "trial"
    # Set at creation from LEGALOS_TRIAL_DAYS; NOT NULL in the database. None
    # only on an Organization built without it, never on one read back.
    trial_ends_at: datetime | None = None
    # The owner's choice on /plans before payment exists. Not a subscription.
    plan_intent: str | None = None
    # --- 0027 (T-042). discount_code_id is the firm's own column; the kind
    # and value are the code's, joined in on every read (they can change if
    # the code itself is later edited, which is deliberate: a firm sees what
    # the code IS, not a snapshot from the moment it was applied).
    discount_code_id: int | None = None
    discount_applied_at: datetime | None = None
    discount_kind: str | None = None
    discount_value: Decimal | None = None

    @property
    def trial_expired(self) -> bool:
        """A signal, not a lock: nothing refuses a write because of this."""
        return self.trial_ends_at is not None and self.trial_ends_at <= datetime.now(UTC)


# One list, used for the SELECT and for mapping the row back by name, so a
# column added in one place cannot be forgotten in the other. Plain
# organizations columns only -- discount_kind/discount_value come from the
# joined discount_codes row and are appended separately below.
_ORG_FIELDS = (
    "id", "name", "created_by", "registration_number", "phone", "address",
    "logo_url", "specialties",
    "governorate", "main_court", "firm_size", "client_kind",
    "legal_name", "tax_id", "bar_number", "website", "brand_color",
    "locale", "timezone", "date_format", "default_currency",
    "invoice_number_pattern", "default_tax_rate", "default_payment_terms_days",
    "required_fields",
    "plan", "trial_ends_at", "plan_intent",
    "discount_code_id", "discount_applied_at",
)
_ORG_COLUMNS = ", ".join(f"o.{name}" for name in _ORG_FIELDS)
_ORG_DISCOUNT_COLUMNS = "dc.kind AS discount_kind, dc.value AS discount_value"
_ORG_SELECT_SQL = (
    f"SELECT {_ORG_COLUMNS}, {_ORG_DISCOUNT_COLUMNS} "
    "FROM organizations o LEFT JOIN discount_codes dc ON dc.id = o.discount_code_id"
)
_ORG_ROW_FIELDS = _ORG_FIELDS + ("discount_kind", "discount_value")


def _row_to_organization(row) -> Organization:
    values = dict(zip(_ORG_ROW_FIELDS, row))
    values["specialties"] = tuple(values["specialties"] or ())
    values["required_fields"] = dict(values["required_fields"] or {})
    return Organization(**values)


@dataclass(frozen=True)
class Membership:
    id: int
    organization_id: int
    clerk_user_id: str
    role: str
    # Firm-side display identity. Clerk knows a user's name but not their
    # title here, and every practice screen that shows "who is responsible"
    # needs both without a Clerk API call per row. Optional because a
    # membership created by accepting an invite has neither set yet.
    display_name: str | None = None
    title: str | None = None
    # Whether this person sees every case in the firm, or only the ones
    # matter_staff puts them on. Defaults to the open setting here so that a
    # Membership built without it -- in a test, or by older code -- never
    # accidentally hides rows; the database default is the closed one, which
    # is where it matters. See legalrag.practice.scope.
    matter_scope: str = "all"


def create_organization(
    conn: psycopg.Connection,
    name: str,
    creator_clerk_user_id: str,
    specialties: list[str] | None = None,
) -> Organization:
    """Creates an organization and makes its creator the Owner, atomically.

    `specialties` is the one detail collected on the create screen besides
    the name (T-040): it is what makes the first screen after sign-in mean
    something. Validated against the same list as the settings PATCH.
    """
    chosen = validate_specialties(specialties or [])
    # The trial clock starts now, for the configured number of days. Read at
    # each creation, not at import: changing LEGALOS_TRIAL_DAYS and restarting
    # gives the NEXT firm the new length and leaves every existing firm on the
    # end date it was given.
    trial_days = get_trial_days()
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO organizations (name, created_by, specialties, trial_ends_at) "
            "VALUES (%s, %s, %s, now() + make_interval(days => %s)) "
            "RETURNING id, trial_ends_at",
            (name, creator_clerk_user_id, chosen, trial_days),
        )
        org_id, trial_ends_at = cur.fetchone()
        cur.execute(
            "INSERT INTO memberships (organization_id, clerk_user_id, role) "
            "VALUES (%s, %s, 'owner')",
            (org_id, creator_clerk_user_id),
        )
    # Suggested document tags, planted once. Imported here rather than at
    # module level because legalrag.practice imports Membership from this
    # module.
    from legalrag.db import set_tenant_context
    from legalrag.practice.document_tags import seed_default_tags

    set_tenant_context(conn, org_id)
    seed_default_tags(conn, org_id)
    conn.commit()
    return Organization(
        id=org_id,
        name=name,
        created_by=creator_clerk_user_id,
        specialties=tuple(chosen),
        trial_ends_at=trial_ends_at,
    )


def set_plan_intent(
    conn: psycopg.Connection, organization_id: int, plan: str
) -> Organization | None:
    """Records which paid plan the firm wants, before payment exists (T-041).

    An intent, not a subscription: `plan` stays 'trial', nothing is unlocked
    or locked, and the trial keeps its end date. Kept apart from
    update_organization on purpose -- that PATCH is the settings form, and
    a plan choice arriving as one more optional field there would let a
    client set it without meaning to.
    """
    _one_of("plan", plan, PAID_PLANS)
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE organizations SET plan_intent = %s, updated_at = now() WHERE id = %s",
            (plan, organization_id),
        )
        if cur.rowcount == 0:
            return None
    conn.commit()
    return get_organization(conn, organization_id)


# --- discount codes (0027, T-042) --------------------------------------------
#
# Three kinds because one of them works today. `extra_trial_days` extends
# `trial_ends_at` immediately -- it is the only kind with a real effect
# before a payment gateway exists. `percent` and `fixed` are recorded on the
# firm and shown as "will apply once billing is enabled"; the arithmetic
# happens in the payment ticket, in Decimal, against a real price.
#
# validate_discount_code is deliberately silent about WHY a code fails: a
# code that does not exist, one that has expired and one that is exhausted
# all read back as the same "not valid" from the API, because a route that
# tells the three apart is a code-guessing oracle. apply_discount_code is
# the only place that touches the database, and it is what a valid code
# actually becomes real through.


class InvalidDiscountCode(Exception):
    """A code that does not exist, is inactive, is outside its window, or has
    used up its max_uses. Deliberately one exception for all four -- see the
    module note on why the reason is never surfaced."""


class DiscountAlreadyApplied(Exception):
    """This organization already has a code. One per firm."""


def validate_discount_code(conn: psycopg.Connection, code: str) -> bool:
    """Whether `code` could be applied right now. Read-only -- unlike
    apply_discount_code, this never increments uses_count, so checking a
    code does not spend one of its uses. Backs the public, session-less
    POST /api/discount-codes/validate the landing page calls."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM discount_codes WHERE lower(code) = lower(%s) AND is_active "
            "AND (starts_at IS NULL OR starts_at <= now()) "
            "AND (ends_at IS NULL OR ends_at > now()) "
            "AND (max_uses IS NULL OR uses_count < max_uses)",
            (code,),
        )
        return cur.fetchone() is not None


def apply_discount_code(
    conn: psycopg.Connection, organization_id: int, code: str
) -> Organization:
    """Claims `code` for `organization_id`, atomically, and applies it if its
    kind has an effect today.

    Two things have to be race-safe, and are handled by ordinary row locking
    rather than an application-level lock:

    * `max_uses` -- the UPDATE ... WHERE uses_count < max_uses ... RETURNING
      below takes Postgres's row lock on the discount_codes row. Two firms
      racing to claim the last use serialise on that lock: the first commits
      its increment, the second's WHERE re-evaluates against the now-current
      uses_count and finds no row, so only one caller ever gets a `claimed`
      row back.
    * one code per firm -- `SELECT ... FOR UPDATE` on the organizations row
      first means a second concurrent call for the SAME firm blocks until
      the first commits or rolls back, rather than both reading
      discount_code_id as NULL and both trying to set it.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT discount_code_id FROM organizations WHERE id = %s FOR UPDATE",
            (organization_id,),
        )
        row = cur.fetchone()
        if row is None:
            conn.rollback()
            raise LookupError(f"no organization {organization_id}")
        if row[0] is not None:
            conn.rollback()
            raise DiscountAlreadyApplied()

        cur.execute(
            "UPDATE discount_codes SET uses_count = uses_count + 1 "
            "WHERE lower(code) = lower(%s) AND is_active "
            "AND (starts_at IS NULL OR starts_at <= now()) "
            "AND (ends_at IS NULL OR ends_at > now()) "
            "AND (max_uses IS NULL OR uses_count < max_uses) "
            "RETURNING id, kind, value",
            (code,),
        )
        claimed = cur.fetchone()
        if claimed is None:
            conn.rollback()
            raise InvalidDiscountCode()
        discount_id, kind, value = claimed

        if kind == "extra_trial_days":
            # Whole days; the column is an integer count by construction
            # (see the CHECK in 0027 and the units documented there).
            cur.execute(
                "UPDATE organizations SET "
                "trial_ends_at = trial_ends_at + make_interval(days => %s), "
                "discount_code_id = %s, discount_applied_at = now() "
                "WHERE id = %s",
                (int(value), discount_id, organization_id),
            )
        else:
            cur.execute(
                "UPDATE organizations SET discount_code_id = %s, discount_applied_at = now() "
                "WHERE id = %s",
                (discount_id, organization_id),
            )
    conn.commit()
    org = get_organization(conn, organization_id)
    assert org is not None
    return org


def get_organization(
    conn: psycopg.Connection, organization_id: int
) -> Organization | None:
    with conn.cursor() as cur:
        cur.execute(f"{_ORG_SELECT_SQL} WHERE o.id = %s", (organization_id,))
        row = cur.fetchone()
        return _row_to_organization(row) if row else None


_ORG_UPDATABLE = (
    "name", "registration_number", "phone", "address", "logo_url", "specialties",
    "governorate", "main_court", "firm_size", "client_kind",
    "legal_name", "tax_id", "bar_number", "website", "brand_color",
    "locale", "timezone", "date_format", "default_currency",
    "invoice_number_pattern", "default_tax_rate", "default_payment_terms_days",
    "required_fields",
)

# Fields that may be cleared with "" -- the API's convention since 0018 is
# that an empty string empties a nullable field. Stored as NULL, not "".
_NULLABLE_TEXT = (
    "registration_number", "phone", "address", "logo_url",
    "governorate", "main_court", "firm_size", "client_kind",
    "legal_name", "tax_id", "bar_number", "website", "brand_color",
    "invoice_number_pattern",
)


def _one_of(name: str, value: str, choices: tuple[str, ...]) -> str:
    if value not in choices:
        raise ValueError(f"unknown {name} {value!r}; one of {', '.join(choices)}")
    return value


def validate_invoice_number_pattern(pattern: str) -> str:
    """A pattern is {year} and {seq} in any text, and it must END with {seq}.

    Ending with the sequence is what lets next_invoice_number parse the last
    number issued back into an integer: everything before {seq} is a fixed
    prefix once the year is filled in.
    """
    names = [name for _, name, _, _ in string.Formatter().parse(pattern) if name is not None]
    unknown = sorted(set(names) - {"year", "seq"})
    if unknown:
        raise ValueError(f"invoice number pattern may use only {{year}} and {{seq}}, not {unknown}")
    if names.count("seq") != 1 or not pattern.endswith("{seq}"):
        raise ValueError("invoice number pattern must end with {seq}, exactly once")
    return pattern


def validate_required_fields(value) -> dict[str, list[str]]:
    """Closed shape: {"matter": [...], "client": [...]} over known fields."""
    if not isinstance(value, dict):
        raise ValueError("required_fields must be an object")
    out: dict[str, list[str]] = {}
    for key, names in value.items():
        if key not in REQUIRED_FIELD_CHOICES:
            raise ValueError(f"unknown required_fields key {key!r}; one of {', '.join(REQUIRED_FIELD_CHOICES)}")
        if not isinstance(names, list):
            raise ValueError(f"required_fields[{key!r}] must be a list of field names")
        kept: list[str] = []
        for name in names:
            if name not in REQUIRED_FIELD_CHOICES[key]:
                raise ValueError(f"unknown {key} field {name!r} in required_fields")
            if name not in kept:
                kept.append(name)
        out[key] = kept
    return out


def validate_settings(fields: dict) -> dict:
    """Every closed list and bound in one place. Mutates and returns `fields`."""
    if "locale" in fields:
        _one_of("locale", fields["locale"], LOCALES)
    if "date_format" in fields:
        _one_of("date_format", fields["date_format"], DATE_FORMATS)
    if "firm_size" in fields:
        _one_of("firm_size", fields["firm_size"], FIRM_SIZES)
    if "client_kind" in fields:
        _one_of("client_kind", fields["client_kind"], CLIENT_KINDS)
    if "brand_color" in fields:
        _one_of("brand_color", fields["brand_color"], BRAND_COLORS)
    if "timezone" in fields:
        try:
            ZoneInfo(fields["timezone"])
        except Exception:  # noqa: BLE001 - any failure means "not a zone"
            raise ValueError(f"unknown timezone {fields['timezone']!r}") from None
    if "default_currency" in fields:
        code = fields["default_currency"]
        if not (isinstance(code, str) and len(code) == 3 and code.isalpha() and code.isupper()):
            raise ValueError("default_currency must be a three-letter ISO code such as EGP")
    if "default_tax_rate" in fields:
        rate = Decimal(str(fields["default_tax_rate"]))
        if not (0 <= rate <= 1):
            raise ValueError(f"default tax rate must be between 0 and 1, got {rate}")
        fields["default_tax_rate"] = rate
    if "default_payment_terms_days" in fields:
        days = int(fields["default_payment_terms_days"])
        if days < 0:
            raise ValueError("default payment terms cannot be negative")
        fields["default_payment_terms_days"] = days
    if "invoice_number_pattern" in fields:
        validate_invoice_number_pattern(fields["invoice_number_pattern"])
    if "required_fields" in fields:
        fields["required_fields"] = validate_required_fields(fields["required_fields"])
    return fields


def validate_specialties(values) -> list[str]:
    """Rejects anything outside the shared matter-type list, and de-duplicates.

    Order is kept as given: a firm that lists its main practice area first
    means something by it, and a set would lose that.
    """
    from legalrag.practice.matters import MATTER_TYPES

    seen: list[str] = []
    for value in values:
        if value not in MATTER_TYPES:
            raise ValueError(f"unknown specialty {value!r}")
        if value not in seen:
            seen.append(value)
    return seen


def update_organization(
    conn: psycopg.Connection, organization_id: int, **changes
) -> Organization | None:
    """Edits the firm's own details. Unmentioned fields are left alone.

    None means "not supplied" rather than "clear it", matching the other
    PATCH-shaped updates in this codebase; an empty string is how a field is
    emptied, so a firm that deletes its phone number can actually do so.
    """
    fields = {
        key: value
        for key, value in changes.items()
        if key in _ORG_UPDATABLE and value is not None
    }
    if "specialties" in fields:
        fields["specialties"] = validate_specialties(fields["specialties"])
    # "" clears a nullable text field; validated only when something is left.
    for key in _NULLABLE_TEXT:
        if key in fields and fields[key] == "":
            fields[key] = None
    present = {k: v for k, v in fields.items() if v is not None}
    validate_settings(present)
    fields.update(present)
    if "required_fields" in fields:
        fields["required_fields"] = Jsonb(fields["required_fields"])
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE organizations SET {assignments}, updated_at = now() "
                "WHERE id = %s",
                (*fields.values(), organization_id),
            )
            if cur.rowcount == 0:
                return None
        conn.commit()
    return get_organization(conn, organization_id)


def list_memberships_for_user(
    conn: psycopg.Connection, clerk_user_id: str
) -> list[Membership]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role "
            "FROM memberships WHERE clerk_user_id = %s",
            (clerk_user_id,),
        )
        return [Membership(*row) for row in cur.fetchall()]


def get_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str
) -> Membership | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role, display_name, "
            "title, matter_scope FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
        row = cur.fetchone()
        return Membership(*row) if row else None


def list_org_members(
    conn: psycopg.Connection, organization_id: int
) -> list[Membership]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role, display_name, title, "
            "matter_scope "
            "FROM memberships WHERE organization_id = %s ORDER BY created_at",
            (organization_id,),
        )
        return [Membership(*row) for row in cur.fetchall()]


def set_member_profile(
    conn: psycopg.Connection,
    organization_id: int,
    clerk_user_id: str,
    *,
    display_name: str | None = None,
    title: str | None = None,
) -> Membership | None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE memberships SET display_name = coalesce(%s, display_name), "
            "title = coalesce(%s, title) "
            "WHERE organization_id = %s AND clerk_user_id = %s "
            "RETURNING id, organization_id, clerk_user_id, role, display_name, title",
            (display_name, title, organization_id, clerk_user_id),
        )
        row = cur.fetchone()
    conn.commit()
    return Membership(*row) if row else None


@dataclass(frozen=True)
class NotificationPreferences:
    """A member's own reminder channels (T-034). Not a firm setting -- these
    columns (wants_reminders since 0013, wants_push since 0016) belong to the
    membership, so any member sets their own regardless of role."""

    wants_reminders: bool
    wants_push: bool


def get_notification_preferences(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str
) -> NotificationPreferences | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT wants_reminders, wants_push FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
        row = cur.fetchone()
    return NotificationPreferences(*row) if row else None


def set_notification_preferences(
    conn: psycopg.Connection,
    organization_id: int,
    clerk_user_id: str,
    *,
    wants_reminders: bool | None = None,
    wants_push: bool | None = None,
) -> NotificationPreferences | None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE memberships SET "
            "wants_reminders = coalesce(%s, wants_reminders), "
            "wants_push = coalesce(%s, wants_push) "
            "WHERE organization_id = %s AND clerk_user_id = %s "
            "RETURNING wants_reminders, wants_push",
            (wants_reminders, wants_push, organization_id, clerk_user_id),
        )
        row = cur.fetchone()
    conn.commit()
    return NotificationPreferences(*row) if row else None


def add_membership(
    conn: psycopg.Connection,
    organization_id: int,
    clerk_user_id: str,
    role: str,
    email: str | None = None,
) -> Membership:
    """Adds someone to a firm.

    `email` is where the reminder sweep writes to, and it is optional only
    because a membership can be created without one being known. Whoever DOES
    know it must pass it: a member with no address is silently reported as
    undeliverable by the sweep every morning, forever.
    """
    if role not in ROLES:
        raise ValueError(f"invalid role {role!r}; expected one of {ROLES}")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO memberships (organization_id, clerk_user_id, role, email) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (organization_id, clerk_user_id, role, email),
        )
        membership_id = cur.fetchone()[0]
    conn.commit()
    return Membership(
        id=membership_id,
        organization_id=organization_id,
        clerk_user_id=clerk_user_id,
        role=role,
    )


def remove_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str
) -> None:
    """Removes a member. A no-op if they weren't a member.

    Raises LastOwnerError, and leaves the row in place, rather than ever
    letting an organization end up with zero Owners.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT role FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
        row = cur.fetchone()
        if row is None:
            return
        role = row[0]

        if role == "owner":
            # Lock the org's owner-role rows before counting them, so a
            # concurrent remove_membership call for another owner of the
            # same organization blocks here until this transaction commits
            # or rolls back -- otherwise both could read the same
            # pre-removal owner count under READ COMMITTED and both pass
            # the "at least one Owner" check. (Postgres disallows FOR
            # UPDATE directly on an aggregate query, so lock the rows and
            # count them in Python instead of using SELECT count(*).)
            cur.execute(
                "SELECT id FROM memberships "
                "WHERE organization_id = %s AND role = 'owner' "
                "FOR UPDATE",
                (organization_id,),
            )
            if len(cur.fetchall()) <= 1:
                raise LastOwnerError(
                    "cannot remove the only Owner of an organization"
                )

        cur.execute(
            "DELETE FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
    conn.commit()


SCOPES = ("all", "assigned")


def set_matter_scope(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str, scope: str
) -> Membership:
    """Opens or closes what one member can see.

    An owner is not scopeable. Someone who can change everyone's access can
    lift their own in one click, so a restricted owner is a false sense of
    security rather than a control -- better to refuse it and say why.
    """
    if scope not in SCOPES:
        raise ValueError(f"invalid matter scope {scope!r}")

    membership = get_membership(conn, organization_id, clerk_user_id)
    if membership is None:
        raise LookupError(f"no membership for {clerk_user_id}")
    if membership.role == "owner" and scope != "all":
        raise ValueError("an owner always sees every case")

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE memberships SET matter_scope = %s "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (scope, organization_id, clerk_user_id),
        )
    conn.commit()
    updated = get_membership(conn, organization_id, clerk_user_id)
    assert updated is not None
    return updated
