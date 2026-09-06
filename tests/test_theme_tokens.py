"""
اختبار تطابق ومزامنة رموز قالب «السِّجل» (Sijil Admin) بين theme.ts و globals.css.
يضمن هذا الاختبار عدم تباعد نسختي اللوحة اللونية (T-048 / E-5).
"""

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
THEME_TS = REPO_ROOT / "web" / "lib" / "theme.ts"
GLOBALS_CSS = REPO_ROOT / "web" / "app" / "globals.css"


def parse_css_block(css_content: str, selector_pattern: str) -> dict[str, str]:
    """استخراج خصائص CSS من كتلة محددة بواسطة محدد النمط."""
    match = re.search(selector_pattern + r"\s*\{([^}]+)\}", css_content, re.MULTILINE)
    assert match, f"لم يتم العثور على كتلة CSS للمحدد: {selector_pattern}"
    block = match.group(1)
    # التعليقات تُحذف قبل التقطيع لا بعده: التقطيع على «؛» يجعل التعليق يلتصق
    # بالتصريح الذي يليه، فيُتخطّى الاثنان معًا ويختفي رمز من المقارنة بلا سبب
    # ظاهر. حدث ذلك فعلًا مع --accent حين شُرح سببُ اشتقاقه بتعليق فوقه.
    block = re.sub(r"/\*.*?\*/", "", block, flags=re.DOTALL)
    props = {}
    for line in block.split(";"):
        line = line.strip()
        if not line or line.startswith("/*"):
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            props[k.strip()] = v.strip()
    return props


def parse_theme_ts_tokens(ts_content: str) -> dict[str, str | tuple[str, str]]:
    """استخراج رموز sijilTokens من ملف theme.ts."""
    tokens = {}
    # العثور على كتلة sijilTokens
    match = re.search(r"const sijilTokens:\s*SijilThemeTokens\s*=\s*\{([\s\S]+?)\n\};", ts_content)
    assert match, "لم يتم العثور على كتلة sijilTokens في web/lib/theme.ts"
    block = match.group(1)

    # مطابقة الأزواج [فاتح, داكن] مع دعم الفواصل السطرية والفاصلة الأخيرة
    tuple_pattern = re.compile(
        r'["\'](--[a-zA-Z0-9_-]+)["\']:\s*\[\s*["\']([^"\']+)["\'],\s*["\']([^"\']+)["\'],?\s*\]',
        re.MULTILINE | re.DOTALL
    )
    for m in tuple_pattern.finditer(block):
        token_name, light_val, dark_val = m.groups()
        tokens[token_name] = (light_val, dark_val)

    # مطابقة القيم المفردة
    single_pattern = re.compile(r'["\'](--[a-zA-Z0-9_-]+)["\']:\s*["\']([^"\']+)["\']')
    for m in single_pattern.finditer(block):
        token_name, val = m.groups()
        if token_name not in tokens:
            tokens[token_name] = val

    return tokens


def test_color_scheme_coupling():
    """التحقق من وجود اقتران color-scheme في كتلتي globals.css لضمان عمل light-dark()."""
    css = GLOBALS_CSS.read_text(encoding="utf-8")
    light_props = parse_css_block(css, r":root,\s*\[data-theme=[\"']light[\"']\]")
    dark_props = parse_css_block(css, r"\[data-theme=[\"']dark[\"']\]")

    assert light_props.get("color-scheme") == "light", "يجب أن تحتوي كتلة light على color-scheme: light"
    assert dark_props.get("color-scheme") == "dark", "يجب أن تحتوي كتلة dark على color-scheme: dark"


def test_theme_tokens_parity():
    """التحقق من تطابق جميع رموز القالب بين theme.ts و globals.css."""
    assert THEME_TS.exists(), "ملف web/lib/theme.ts غير موجود"
    assert GLOBALS_CSS.exists(), "ملف web/app/globals.css غير موجود"

    ts_content = THEME_TS.read_text(encoding="utf-8")
    css_content = GLOBALS_CSS.read_text(encoding="utf-8")

    ts_tokens = parse_theme_ts_tokens(ts_content)
    light_props = parse_css_block(css_content, r":root,\s*\[data-theme=[\"']light[\"']\]")
    dark_props = parse_css_block(css_content, r"\[data-theme=[\"']dark[\"']\]")

    # الرموز الأساسية المستهدفة بالمقارنة المباشرة
    direct_tokens = [
        "--brand-h", "--r", "--rs", "--rowpad",
        "--bg", "--surface", "--surface2", "--surface3",
        "--text", "--text2", "--text3",
        "--border", "--border2",
        "--primary", "--primary-h", "--primary-fg", "--primary-soft",
        "--accent", "--accent-fg", "--accent-soft",
        "--success", "--success-soft",
        "--warn", "--warn-soft",
        "--danger", "--danger-soft",
        "--info", "--info-soft",
        "--ring",
    ]

    for token in direct_tokens:
        assert token in ts_tokens, f"الرمز {token} مفقود في theme.ts"
        assert token in light_props, f"الرمز {token} مفقود في globals.css (light)"
        assert token in dark_props, f"الرمز {token} مفقود في globals.css (dark)"

        ts_val = ts_tokens[token]
        if isinstance(ts_val, tuple):
            light_exp, dark_exp = ts_val
            assert light_props[token] == light_exp, (
                f"تباين في {token} (light): globals.css={light_props[token]} != theme.ts={light_exp}"
            )
            assert dark_props[token] == dark_exp, (
                f"تباين في {token} (dark): globals.css={dark_props[token]} != theme.ts={dark_exp}"
            )
        else:
            assert light_props[token] == ts_val, (
                f"تباين في {token} (light): globals.css={light_props[token]} != theme.ts={ts_val}"
            )
            assert dark_props[token] == ts_val, (
                f"تباين في {token} (dark): globals.css={dark_props[token]} != theme.ts={ts_val}"
            )


def test_astryx_semantic_tokens_reference_vars():
    """التحقق من أن رموز Astryx الدلالية في theme.ts تسند إلى var(--*) بدلاً من قيم سداسية مخترعة."""
    ts_content = THEME_TS.read_text(encoding="utf-8")
    ts_tokens = parse_theme_ts_tokens(ts_content)

    expected_mappings = {
        "--color-background-body": "var(--bg)",
        "--color-background-surface": "var(--surface)",
        "--color-background-card": "var(--surface)",
        "--color-background-popover": "var(--surface2)",
        "--color-background-inverted": "var(--text)",
        "--color-background-muted": "var(--surface2)",
        "--color-border": "var(--border)",
        "--color-border-emphasized": "var(--border2)",
        "--color-text-primary": "var(--text)",
        "--color-text-secondary": "var(--text2)",
        "--color-text-disabled": "var(--text3)",
        "--color-accent": "var(--primary)",
        "--color-accent-muted": "var(--primary-soft)",
        "--color-success": "var(--success)",
        "--color-success-muted": "var(--success-soft)",
        "--color-warning": "var(--warn)",
        "--color-warning-muted": "var(--warn-soft)",
        "--color-error": "var(--danger)",
        "--color-error-muted": "var(--danger-soft)",
    }

    for token, exp_var in expected_mappings.items():
        assert token in ts_tokens, f"الرمز الدلالي {token} مفقود في theme.ts"
        val = ts_tokens[token]
        if isinstance(val, tuple):
            assert val[0] == exp_var and val[1] == exp_var, (
                f"الرمز الدلالي {token} في theme.ts يجب أن يسند إلى {exp_var} ولكن قيمته: {val}"
            )
        else:
            assert val == exp_var, (
                f"الرمز الدلالي {token} في theme.ts يجب أن يسند إلى {exp_var} ولكن قيمته: {val}"
            )
