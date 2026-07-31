"""Phase 0 prototype: chat over the full text of 3 Egyptian statutes.

No chunking, no retrieval, no citation verification — the point is to see
raw model behavior on real questions before building any retrieval
scaffolding. Run: uv run streamlit run scratch/phase0.py
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"

SYSTEM_PROMPT_HEADER = (
    "أنت مساعد بحث قانوني. أجب فقط استنادًا إلى نصوص القوانين المرفقة أدناه، "
    "واذكر رقم القانون وسنته ورقم المادة في كل إجابة. إذا لم يكن الجواب موجودًا "
    "في النصوص المرفقة، قل ذلك صراحة ولا تخمن. هذه الأداة مساعدة بحثية وليست "
    "استشارة قانونية.\n\n"
)


def load_statute_texts(raw_dir: Path) -> list[dict]:
    statutes = []
    for meta_path in sorted(raw_dir.glob("*.meta.json")):
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        txt_path = raw_dir / f"{meta['slug']}.txt"
        statutes.append(
            {
                "law_number": meta["law_number"],
                "law_year": meta["law_year"],
                "title_ar": meta["title_ar"],
                "text": txt_path.read_text(encoding="utf-8"),
            }
        )
    return statutes


def build_system_prompt(statutes: list[dict]) -> str:
    parts = [SYSTEM_PROMPT_HEADER]
    for s in statutes:
        parts.append(
            f"=== {s['title_ar']} - قانون رقم {s['law_number']} لسنة {s['law_year']} ===\n"
            f"{s['text']}\n"
        )
    return "\n".join(parts)


st.set_page_config(page_title="Legal RAG Phase 0", page_icon="⚖️")
st.title("Egyptian Law Q&A — Phase 0 prototype")
st.caption(
    "Research assistance only, not legal advice. Answers are drawn from the "
    "Civil Code (131/1948), Labour Law (12/2003), and Companies Law (159/1981)."
)

api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    st.error("Set OPENROUTER_API_KEY in .env before running this app.")
    st.stop()

client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)

if "statutes" not in st.session_state:
    st.session_state.statutes = load_statute_texts(RAW_DIR)
if "system_prompt" not in st.session_state:
    st.session_state.system_prompt = build_system_prompt(st.session_state.statutes)
st.caption(f"~{len(st.session_state.system_prompt):,} chars of statute text in context")
if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

question = st.chat_input("اسأل عن القانون المدني أو قانون العمل أو قانون الشركات...")
if question:
    st.session_state.messages.append({"role": "user", "content": question})
    with st.chat_message("user"):
        st.markdown(question)

    with st.chat_message("assistant"):
        with st.spinner("جارٍ البحث في نصوص القانون..."):
            try:
                response = client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {"role": "system", "content": st.session_state.system_prompt},
                        *st.session_state.messages,
                    ],
                )
                reply = response.choices[0].message.content or "(empty response from model)"
            except Exception as e:
                reply = f"⚠️ حدث خطأ أثناء الاتصال بالنموذج: {e}"
        st.markdown(reply)
    st.session_state.messages.append({"role": "assistant", "content": reply})
