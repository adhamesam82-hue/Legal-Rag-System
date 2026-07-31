# Phase 0 — Question Log

Filled in while using `scratch/phase0.py`. For each question: what you asked, what
it answered, and whether the answer was actually correct (check citations against
the real statute text in `data/raw/`, not just against how confident the answer
sounds).

## Question 1

- **Asked:** ما هي مدة التقادم العادي لسقوط الحقوق الشخصية بحسب القانون المدني؟
- **Answer summary:** 15 years is the ordinary limitation period, with shorter special periods (5y for periodic/recurring dues and professional fees, 3y for taxes/tort/unjust enrichment, 1y for merchant/worker wage claims).
- **Citation given (law + article):** Civil Code 131/1948, Art. 374 (main rule), Art. 375-378 (exceptions).
- **Citation correct? (checked against data/raw/):** Yes — Art. 374 text quoted verbatim matches `eg-civil-code-131-1948.txt` line 989; Art. 375-378 exception summaries match the source text exactly.
- **Verdict:** correct

## Question 2

- **Asked:** في أي سن يكتمل الشخص أهليته الكاملة لمباشرة حقوقه المدنية؟
- **Answer summary:** Full legal capacity at 21 full Gregorian years, provided sound mind and not interdicted. Also summarized Arts. 45-46 on diminished/incapacitated persons.
- **Citation given (law + article):** Civil Code 131/1948, Art. 44 (+ Arts. 45, 46 as supplementary notes).
- **Citation correct? (checked against data/raw/):** Yes — Art. 44 quoted verbatim matches line 127; Arts. 45-46 also verbatim.
- **Verdict:** correct

## Question 3

- **Asked:** ما هي مدة فترة الاختبار القصوى التي يجوز الاتفاق عليها بين العامل وصاحب العمل؟
- **Answer summary:** Max probation period is 3 months; may not be used more than once with the same employer.
- **Citation given (law + article):** Labour Law 12/2003, Art. 33.
- **Citation correct? (checked against data/raw/):** Yes — verbatim match in `eg-labour-law-12-2003.txt` line 187.
- **Verdict:** correct

## Question 4

- **Asked:** كم عدد ساعات العمل الفعلية اليومية والأسبوعية القصوى؟
- **Answer summary:** Max 8 hours/day or 48 hours/week of actual work, excluding meal/rest breaks. Noted Art. 85 allows exceeding this for urgent/exceptional circumstances but never beyond 10 hours/day.
- **Citation given (law + article):** Labour Law 12/2003, Art. 80 (+ Art. 85 note).
- **Citation correct? (checked against data/raw/):** Yes — Art. 80 verbatim match at line 380; Art. 85 cross-reference also correct.
- **Verdict:** correct

## Question 5

- **Asked:** كم عدد أيام الإجازة السنوية المستحقة للعامل بعد أمضى سنة كاملة في الخدمة؟
- **Answer summary:** 21 days full pay after one full year; rises to 30 days after 10 years' service or after age 50; pro-rated if under a year (min. 6 months' service); +7 days for hazardous/remote work.
- **Citation given (law + article):** Labour Law 12/2003, Art. 47.
- **Citation correct? (checked against data/raw/):** Yes — verbatim match at line 235.
- **Verdict:** correct

## Question 6

- **Asked:** ما هي نسبة الأجر الإضافي التي يستحقها العامل عن ساعات العمل الإضافية نهارًا وليلًا؟
- **Answer summary:** Overtime pay must be at least base hourly wage +35% for daytime overtime, +70% for nighttime overtime; working on the weekly rest day earns double pay for that day plus a substitute rest day.
- **Citation given (law + article):** Labour Law 12/2003, Art. 85.
- **Citation correct? (checked against data/raw/):** Yes — verbatim match at line 394.
- **Verdict:** correct

## Question 7

- **Asked:** ما هو الحد الأدنى لعدد المؤسسين اللازم لتأسيس شركة مساهمة؟
- **Answer summary:** Minimum 3 founding partners for a joint-stock company (2 for other company types under this law), except one-person companies; falling below the minimum triggers dissolution by law unless cured within 6 months.
- **Citation given (law + article):** Companies Law 159/1981, Art. 8.
- **Citation correct? (checked against data/raw/):** Yes — verbatim match at line 72.
- **Verdict:** correct

## Question 8

- **Asked:** ما هو الحد الأدنى لرأس مال الشركة ذات المسؤولية المحدودة؟
- **Answer summary:** Correctly noted the law itself sets no fixed minimum-capital figure for LLCs — it delegates that to the executive regulations (Art. 32 for issued capital generally, Art. 116 for LLC capital set by the partners). It then added a "practical note" giving a specific figure (EGP 1,000, per a 2018 ministerial decree) that is **not** in the attached texts.
- **Citation given (law + article):** Companies Law 159/1981, Art. 32 and Art. 116 (both correct); the EGP 1,000 figure is attributed to an external ministerial decree not in context.
- **Citation correct? (checked against data/raw/):** Art. 32 and 116 verbatim match (lines 189, 527). The EGP 1,000 figure cannot be verified — it is not present anywhere in `data/raw/`.
- **Verdict:** correct on the in-scope articles, but **appended unsourced outside knowledge** despite the system prompt's explicit instruction not to guess beyond the attached texts. Borderline failure mode — flagged as a "practical note" rather than stated as fact, but still a boundary violation.

## Question 9

- **Asked:** ما هي عقوبة جريمة السرقة بحسب قانون العقوبات المصري؟
- **Answer summary:** Correctly stated the Penal Code is not among the attached texts (only Civil Code, Companies Law, Labour Law) and declined to answer.
- **Citation given (law + article):** None given.
- **Citation correct? (checked against data/raw/):** N/A — correct refusal.
- **Verdict:** appropriate refusal

## Question 10

- **Asked:** ما هي إجراءات وشروط الطلاق بين الزوجين بحسب قانون الأحوال الشخصية المصري؟
- **Answer summary:** Correctly stated the Personal Status Law is not among the attached texts and declined to give divorce procedure/conditions. Went one step further (unprompted) and surfaced the Civil Code's conflict-of-laws provisions that happen to touch divorce — which country's law governs divorce for mixed-nationality couples — while explicitly flagging that these are *not* the substantive divorce rules and naming (without quoting) the real Personal Status statutes (Law 25/1929, Law 1/2000) as being outside its context.
- **Citation given (law + article):** Civil Code 131/1948, Art. 13(2) and Art. 14 (conflict-of-laws only, correctly scoped).
- **Citation correct? (checked against data/raw/):** Yes — both quoted verbatim, matching `eg-civil-code-131-1948.txt` lines 48-52 exactly.
- **Verdict:** appropriate refusal, with a nuance worth watching: it added adjacent-but-real citations instead of a flat refusal. Correct and well-scoped here, but this "let me find something tangentially related" instinct is exactly the behavior that produced the Q8 overreach — it worked in-bounds this time only because the tangential material was actually in the attached text.

## Summary

- Questions answered correctly with a verifiable citation: 9/10
- Questions with a hallucinated or wrong citation: 0/10 — every citation given (direct or tangential) was a verbatim match against `data/raw/`, including exact article numbers and wording, across all 3 statutes.
- Questions correctly refused (no answer in the 3 statutes): 2/10 (Q9 Penal Code, Q10 Personal Status Law) — both correctly identified as out of scope, no fabricated statute content.
- Failure modes observed (to prioritize in Phase 2 if we proceed):
  - **Scope creep beyond attached texts (Q8):** when the statute itself defers a number to secondary regulation, the model filled the gap with outside training knowledge (a specific EGP figure from a 2018 ministerial decree not in `data/raw/`) instead of stopping at "not specified here." Labeled as a caveat, but still violates the "don't guess" instruction.
  - This same reach-for-adjacent-info instinct showed up again in Q10, but stayed in-bounds there because the adjacent material (Civil Code conflict-of-laws articles) was actually present in the attached text. The instinct itself is consistent — whether it's a problem depends entirely on whether the tangential fact happens to live in context. Worth stress-testing further before trusting it unsupervised.
  - Otherwise: no hallucinated articles, no wrong article numbers, no fabricated quotes across all 10 questions.
- Known data quirk: eg-labour-law-12-2003.txt and eg-companies-law-159-1981.txt have a small amount of leftover non-legal boilerplate (related-link teaser text, a repeated title line) at the head/tail — if the model ever cites something like "شرح المادة" as if it were statutory text, this is why. Not observed in this run.
- Decision: proceed to Phase 1, or is whole-document context good enough? — _for discussion. Citation accuracy was flawless at this scale (3 statutes, whole-document context); the one real risk is the model reaching past the provided sources when a clean number isn't available, not retrieval-style errors like wrong articles. That argues the priority for Phase 2 may be tighter prompting/verification against scope creep rather than a retrieval overhaul — but this is a 3-document, single-turn test; it doesn't tell us how this holds up at real corpus scale or across multi-turn conversations._
