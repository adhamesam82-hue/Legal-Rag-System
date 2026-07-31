"""Query expansion -- the substitute for embeddings in a lexical-only system.

Two gaps this closes, both of which vector search would otherwise have covered:

1. The corpus is 100% Arabic. An English question shares no tokens with it and
   scores zero against every article.
2. People do not ask questions in statutory vocabulary. "Can my boss fire me for
   showing up drunk" contains none of the words the article actually uses.

Measured, not assumed: evals/report.py runs the gold set with expansion on and
off and records both numbers.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from openai import OpenAI

from legalrag.llm import client_for

_SYSTEM_PROMPT = """You expand search queries for an Arabic legal database of \
Egyptian statutes. You do not answer questions.

Given a user's question in any language, output the Modern Standard Arabic legal \
terminology that would literally appear in the text of a statute addressing it.

Rules:
- Output Arabic terms only. No English, no explanation, no numbering.
- Use the formal statutory register a legislative drafter would use, not \
colloquial or journalistic phrasing.
- Prefer specific technical terms over generic ones. Include obvious inflectional \
variants of key nouns.
- 10 to 25 terms, separated by spaces.
- If the question names a specific law, put its formal Arabic title on the FIRST \
line, prefixed exactly with "LAW:". Otherwise omit that line entirely.
- Put the terms on the final line.

Example question: "How much notice must my employer give before firing me?"
Example output:
LAW: قانون العمل
إنهاء عقد العمل الإخطار الكتابي مهلة الإخطار فسخ العقد غير محدد المدة إخطار العامل \
صاحب العمل مدة الخدمة المتصلة الفصل التعسفي إنهاء العقد"""

_LAW_LINE = re.compile(r"^\s*LAW:\s*(.+)$", re.MULTILINE)


@dataclass(frozen=True)
class Expansion:
    terms: str
    law_hint: str | None


def expand_query(
    question: str, client: OpenAI | None = None, model: str | None = None
) -> Expansion:
    if client is None or model is None:
        default_client, default_model = client_for("expand")
        client = client or default_client
        model = model or default_model
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        temperature=0,
    )
    raw = (response.choices[0].message.content or "").strip()

    law_match = _LAW_LINE.search(raw)
    law_hint = law_match.group(1).strip() if law_match else None
    terms = _LAW_LINE.sub("", raw).strip()
    return Expansion(terms=terms, law_hint=law_hint)
