# Phase 0 — Question Log

Filled in while using `scratch/phase0.py`. For each question: what you asked, what
it answered, and whether the answer was actually correct (check citations against
the real statute text in `data/raw/`, not just against how confident the answer
sounds).

## Question 1

- **Asked:**
- **Answer summary:**
- **Citation given (law + article):**
- **Citation correct? (checked against data/raw/):**
- **Verdict:** [correct / wrong article / hallucinated citation / appropriate refusal / wrong jurisdiction reasoning]

## Question 2

- **Asked:**
- **Answer summary:**
- **Citation given (law + article):**
- **Citation correct? (checked against data/raw/):**
- **Verdict:**

## Question 3

(repeat this structure through Question 10)

## Summary

- Questions answered correctly with a verifiable citation: _/10
- Questions with a hallucinated or wrong citation: _/10
- Questions correctly refused (no answer in the 3 statutes): _/10
- Failure modes observed (to prioritize in Phase 2 if we proceed):
- Known data quirk: eg-labour-law-12-2003.txt and eg-companies-law-159-1981.txt have a small amount of leftover non-legal boilerplate (related-link teaser text, a repeated title line) at the head/tail — if the model ever cites something like "شرح المادة" as if it were statutory text, this is why.
- Decision: proceed to Phase 1, or is whole-document context good enough?
