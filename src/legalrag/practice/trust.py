"""Client funds — money the firm holds that is not the firm's money.

A retainer paid in advance, a settlement received on a client's behalf, funds
deposited for court fees. It sits in a designated trust account and is drawn
down as invoices are raised against it.

Two rules shape everything here:

  * Amounts are always positive and `kind` carries the direction. A signed
    amount plus a kind would be two sources of truth for one fact, and they
    would eventually disagree.
  * Nothing is ever edited or deleted. A ledger that can be rewritten is not a
    ledger; a mistaken entry is corrected by a compensating one, which is why
    this module has no update or delete.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

# Money in; money out. `refund` returns a client's own funds to them, while
# `invoice_payment` moves funds to the firm against a raised invoice.
KINDS = ("deposit", "withdrawal", "invoice_payment", "refund")
_CREDITS = ("deposit",)

# Namespace for the per-matter advisory lock taken while checking a balance
# against a withdrawal. Distinct from the matter-numbering namespace in
# matters.py so the two never wait on each other.
_LEDGER_LOCK = 4208


@dataclass
class TrustAccount:
    id: int
    organization_id: int
    name: str
    bank_name: str
    account_number: str
    currency: str
    is_default: bool
    created_at: datetime


def list_accounts(
    conn: psycopg.Connection, organization_id: int
) -> list[TrustAccount]:
    return fetch_all(
        conn,
        TrustAccount,
        "SELECT id, organization_id, name, bank_name, account_number, currency, "
        "is_default, created_at FROM trust_accounts WHERE organization_id = %s "
        "ORDER BY is_default DESC, name",
        (organization_id,),
    )


def create_account(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    name: str,
    bank_name: str = "",
    account_number: str = "",
    currency: str = "EGP",
    is_default: bool = False,
) -> TrustAccount:
    with conn.cursor() as cur:
        if is_default:
            # The partial unique index permits one default per firm, so the
            # incumbent has to step down in the same transaction.
            cur.execute(
                "UPDATE trust_accounts SET is_default = FALSE "
                "WHERE organization_id = %s AND is_default",
                (organization_id,),
            )
        else:
            # A firm's first account is its default whether it said so or not:
            # otherwise the common case is an account no deposit defaults to.
            cur.execute(
                "SELECT count(*) FROM trust_accounts WHERE organization_id = %s",
                (organization_id,),
            )
            is_default = cur.fetchone()[0] == 0
        cur.execute(
            "INSERT INTO trust_accounts (organization_id, name, bank_name, "
            "account_number, currency, is_default) VALUES (%s, %s, %s, %s, %s, %s) "
            "RETURNING id, organization_id, name, bank_name, account_number, "
            "currency, is_default, created_at",
            (organization_id, name, bank_name, account_number, currency, is_default),
        )
        row = cur.fetchone()
    conn.commit()
    return TrustAccount(*row)


def default_account_id(
    conn: psycopg.Connection, organization_id: int
) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM trust_accounts WHERE organization_id = %s "
            "ORDER BY is_default DESC, id LIMIT 1",
            (organization_id,),
        )
        row = cur.fetchone()
    return row[0] if row else None


# --- transactions -----------------------------------------------------------


_COLUMNS = """
    x.id, x.organization_id, x.trust_account_id, a.name AS account_name,
    x.matter_id, m.name AS matter_name, x.client_id, c.name AS client_name,
    x.kind, x.amount, x.currency, x.description, x.reference, x.invoice_id,
    i.number AS invoice_number, x.transaction_date, x.recorded_by, x.created_at
"""

_FROM = """
    FROM trust_transactions x
    JOIN trust_accounts a ON a.id = x.trust_account_id
    JOIN matters m ON m.id = x.matter_id
    JOIN clients c ON c.id = x.client_id
    LEFT JOIN invoices i ON i.id = x.invoice_id
"""


@dataclass
class TrustTransaction:
    id: int
    organization_id: int
    trust_account_id: int
    account_name: str
    matter_id: int
    matter_name: str
    client_id: int
    client_name: str
    kind: str
    amount: Decimal
    currency: str
    description: str
    reference: str
    invoice_id: int | None
    invoice_number: str | None
    transaction_date: date
    recorded_by: str
    created_at: datetime

    @property
    def signed_amount(self) -> Decimal:
        return self.amount if self.kind in _CREDITS else -self.amount


def list_transactions(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    client_id: int | None = None,
    trust_account_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
) -> list[TrustTransaction]:
    sql = f"SELECT {_COLUMNS} {_FROM} WHERE x.organization_id = %s"
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND x.matter_id = %s"
        params.append(matter_id)
    if client_id is not None:
        sql += " AND x.client_id = %s"
        params.append(client_id)
    if trust_account_id is not None:
        sql += " AND x.trust_account_id = %s"
        params.append(trust_account_id)
    if since:
        sql += " AND x.transaction_date >= %s"
        params.append(since)
    if until:
        sql += " AND x.transaction_date <= %s"
        params.append(until)
    sql += " ORDER BY x.transaction_date DESC, x.id DESC"
    return fetch_all(conn, TrustTransaction, sql, tuple(params))


def get_transaction(
    conn: psycopg.Connection, organization_id: int, transaction_id: int
) -> TrustTransaction | None:
    return fetch_one(
        conn,
        TrustTransaction,
        f"SELECT {_COLUMNS} {_FROM} WHERE x.organization_id = %s AND x.id = %s",
        (organization_id, transaction_id),
    )


def record_transaction(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int,
    kind: str,
    amount: Decimal,
    transaction_date: date,
    recorded_by: str,
    trust_account_id: int | None = None,
    description: str = "",
    reference: str = "",
    invoice_id: int | None = None,
    currency: str = "EGP",
) -> TrustTransaction:
    if kind not in KINDS:
        raise ValueError(f"invalid kind {kind!r}")
    if amount <= 0:
        raise ValueError("amount must be greater than zero")
    if kind == "invoice_payment" and invoice_id is None:
        raise ValueError("an invoice payment must say which invoice")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT client_id FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(f"matter {matter_id}")
        client_id = row[0]

        account_id = trust_account_id or default_account_id(conn, organization_id)
        if account_id is None:
            raise ValueError("the firm has no trust account to record this against")
        cur.execute(
            "SELECT 1 FROM trust_accounts WHERE organization_id = %s AND id = %s",
            (organization_id, account_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"trust account {account_id}")

        if invoice_id is not None:
            cur.execute(
                "SELECT 1 FROM invoices WHERE organization_id = %s AND id = %s",
                (organization_id, invoice_id),
            )
            if cur.fetchone() is None:
                raise NotFoundError(f"invoice {invoice_id}")

        # Client funds cannot go negative: paying out more than a client has on
        # deposit is spending another client's money.
        #
        # The check and the insert must be atomic, and a balance is an
        # aggregate over rows that do not exist yet, so row locks cannot cover
        # it. An advisory lock keyed on the matter serialises withdrawals from
        # one matter without blocking anything else touching that matter.
        if kind not in _CREDITS:
            cur.execute(
                "SELECT pg_advisory_xact_lock(%s, %s)", (_LEDGER_LOCK, matter_id)
            )
            cur.execute(
                "SELECT coalesce(sum(CASE WHEN kind = 'deposit' THEN amount "
                "ELSE -amount END), 0) FROM trust_transactions "
                "WHERE organization_id = %s AND matter_id = %s",
                (organization_id, matter_id),
            )
            balance = cur.fetchone()[0]
            if amount > balance:
                raise ValueError(
                    f"client funds on this matter are {balance}, "
                    f"which will not cover {amount}"
                )

        cur.execute(
            "INSERT INTO trust_transactions (organization_id, trust_account_id, "
            "matter_id, client_id, kind, amount, currency, description, reference, "
            "invoice_id, transaction_date, recorded_by) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, account_id, matter_id, client_id, kind, amount,
                currency, description, reference, invoice_id, transaction_date,
                recorded_by,
            ),
        )
        transaction_id = cur.fetchone()[0]
    conn.commit()
    transaction = get_transaction(conn, organization_id, transaction_id)
    assert transaction is not None
    return transaction


@dataclass
class TrustBalance:
    matter_id: int | None
    balance: Decimal
    deposits: Decimal
    disbursed: Decimal


def matter_balance(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> TrustBalance:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT coalesce(sum(amount) FILTER (WHERE kind = 'deposit'), 0), "
            "coalesce(sum(amount) FILTER (WHERE kind <> 'deposit'), 0) "
            "FROM trust_transactions WHERE organization_id = %s AND matter_id = %s",
            (organization_id, matter_id),
        )
        deposits, disbursed = cur.fetchone()
    return TrustBalance(matter_id, deposits - disbursed, deposits, disbursed)
