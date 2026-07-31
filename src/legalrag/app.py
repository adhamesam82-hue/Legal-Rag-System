"""Streamlit UI. Run: uv run streamlit run src/legalrag/app.py"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

from legalrag.db import get_connection
from legalrag.pipeline import ask

TRIAGE_PATH = Path(__file__).resolve().parents[2] / "evals" / "triage.jsonl"

JURISDICTIONS = {
    "Egypt (مصر)": "EG",
    "Saudi Arabia (السعودية)": "SA",
}

st.set_page_config(page_title="Legal RAG", page_icon="⚖️", layout="wide")
st.title("⚖️ Egyptian & Saudi Law — Grounded Q&A")
st.caption(
    "Answers are composed only from statute articles retrieved from the corpus, "
    "and every citation is verified against what was retrieved before the answer "
    "is shown. Research assistance, not legal advice."
)

with st.sidebar:
    st.header("Scope")
    # No "both" option: Egyptian and Saudi legal Arabic share vocabulary for
    # materially different rules, so a cross-jurisdiction answer is a wrong one.
    jurisdiction_label = st.radio("Jurisdiction", list(JURISDICTIONS), index=0)
    jurisdiction = JURISDICTIONS[jurisdiction_label]

    st.header("Retrieval")
    limit = st.slider("Articles to retrieve", 3, 15, 8)
    expand = st.checkbox(
        "Query expansion", value=True, help="Translates the question into Arabic legal terms."
    )
    do_rerank = st.checkbox(
        "Rerank", value=True, help="Reorders candidates by whether they answer the question."
    )

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM articles WHERE jurisdiction = %s AND NOT is_repealed",
            (jurisdiction,),
        )
        article_count = cur.fetchone()[0]
        cur.execute(
            "SELECT count(*) FROM instruments WHERE jurisdiction = %s", (jurisdiction,)
        )
        instrument_count = cur.fetchone()[0]
    st.metric("Articles in scope", f"{article_count:,}")
    st.caption(f"across {instrument_count} instruments")

if article_count == 0:
    st.warning(
        f"No articles ingested for {jurisdiction_label}. "
        "Saudi Arabia is Phase 3; only Egypt is currently in the corpus."
    )

question = st.chat_input("Ask about the law in Arabic or English…")

if question:
    with st.chat_message("user"):
        st.markdown(question)

    with st.chat_message("assistant"):
        with st.spinner("Searching the corpus…"):
            with get_connection() as conn:
                result = ask(
                    conn,
                    question,
                    jurisdiction,
                    limit=limit,
                    expand=expand,
                    do_rerank=do_rerank,
                )

        if result.blocked:
            st.error(result.text)
        elif result.refused:
            st.warning(result.text)
        else:
            st.markdown(result.text)

        retrieval = result.retrieval
        label = (
            f"Retrieved {len(retrieval.candidates)} article(s) "
            f"via {retrieval.strategy}"
        )
        with st.expander(label):
            if retrieval.expansion:
                st.caption(f"**Law hint:** {retrieval.expansion.law_hint or '—'}")
                st.caption(f"**Expanded terms:** {retrieval.expansion.terms}")
            if retrieval.missing_citation:
                st.info(
                    "That law is in the corpus, but the article you cited is not — "
                    "it may be repealed or outside what has been ingested."
                )
            for candidate in retrieval.candidates:
                st.markdown(
                    f"**{candidate.citation}** — {candidate.instrument_title}  \n"
                    f"`score {candidate.score:.4f}`"
                )
                st.text(candidate.article_text[:1500])
                st.divider()

        if st.button("👎 Wrong or unhelpful", key=f"triage-{hash(question)}"):
            TRIAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with TRIAGE_PATH.open("a", encoding="utf-8") as fh:
                fh.write(
                    json.dumps(
                        {
                            "at": datetime.now(timezone.utc).isoformat(),
                            "question": question,
                            "jurisdiction": jurisdiction,
                            "strategy": retrieval.strategy,
                            "retrieved": [c.citation for c in retrieval.candidates],
                            "citations": result.citations,
                            "refused": result.refused,
                            "blocked": result.blocked,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
            st.toast("Logged for triage.")
