# Eval history

## 2026-07-31 — model `anthropic/claude-sonnet-5`

Gold set: 38 entries (29 answerable, 9 unanswerable).

### lexical only (no expansion, no rerank)

| category | n | hits | recall@8 | MRR |
| --- | --- | --- | --- | --- |
| exact_citation | 13 | 12 | 0.92 | 0.92 |
| plain_language | 16 | 9 | 0.56 | 0.41 |
| ANSWERABLE | 29 | 21 | 0.72 | 0.64 |
| unanswerable | 9 | 7 | 0.78 | n/a |

Misses:
- `goldset-003` (exact_citation) expected ['131/1948 Art. 1'], got nothing
- `goldset-023` (plain_language) expected ['12/2003 Art. 111'], got ['148/2019 Art. 14', '252/1959 Art. 19', '93/2003 Art. 33']
- `goldset-024` (plain_language) expected ['159/1981 Art. 1'], got nothing
- `goldset-025` (plain_language) expected ['43/1979 Art. 1'], got nothing
- `goldset-026` (plain_language) expected ['88/2003 Art. 5'], got nothing
- `goldset-027` (plain_language) expected ['181/2018 Art. 2'], got nothing
- `goldset-028` (plain_language) expected ['4/1994 Art. 2'], got nothing
- `goldset-029` (plain_language) expected ['17/1983 Art. 76'], got nothing
- `goldset-032` (unanswerable) expected nothing, got ['159/1981 Art. 89', '18/2015 Art. 15', '81/2016 Art. 14']
- `goldset-033` (unanswerable) expected nothing, got ['50/1977 Art. 30', '118/1976 Art. 66', '137/2010 Art. 2']

### + query expansion

| category | n | hits | recall@8 | MRR |
| --- | --- | --- | --- | --- |
| exact_citation | 13 | 13 | 1.00 | 1.00 |
| plain_language | 16 | 12 | 0.75 | 0.39 |
| ANSWERABLE | 29 | 25 | 0.86 | 0.66 |
| unanswerable | 9 | 2 | 0.22 | n/a |

Misses:
- `goldset-024` (plain_language) expected ['159/1981 Art. 1'], got ['159/1981 Art. 3', '159/1981 Art. 129 مكررًا / 3', '159/1981 Art. 4']
- `goldset-025` (plain_language) expected ['43/1979 Art. 1'], got ['43/1979 Art. 146', '12/1984 Art. 104', '45/1982 Art. 98']
- `goldset-028` (plain_language) expected ['4/1994 Art. 2'], got ['4/1994 Art. 15', '4/1994 Art. 5', '4/1994 Art. 1']
- `goldset-029` (plain_language) expected ['17/1983 Art. 76'], got ['35/1978 Art. 116', '17/1983 Art. 16', '17/1983 Art. 60']
- `goldset-030` (unanswerable) expected nothing, got ['12/2003 Art. 33', '12/2003 Art. 91', '12/2003 Art. 104']
- `goldset-031` (unanswerable) expected nothing, got ['67/2016 Art. 1', '67/2016 Art. 10', '67/2016 Art. 36']
- `goldset-032` (unanswerable) expected nothing, got ['159/1981 Art. 89', '50/1977 Art. 6', '18/2015 Art. 15']
- `goldset-033` (unanswerable) expected nothing, got ['50/1977 Art. 30', '137/2010 Art. 2', '17/1999 Art. 12']
- `goldset-036` (unanswerable) expected nothing, got ['106/1976 Art. 36', '131/1948 Art. 908', '157/1981 Art. 108']
- `goldset-037` (unanswerable) expected nothing, got ['106/1976 Art. 36', '25/1966 Art. 35', '25/1966 Art. 3']
- `goldset-038` (unanswerable) expected nothing, got ['159/1981 Art. 17', '157/1981 Art. 195', '159/1981 Art. 162']

### + expansion + rerank (full pipeline)

| category | n | hits | recall@8 | MRR |
| --- | --- | --- | --- | --- |
| exact_citation | 13 | 13 | 1.00 | 1.00 |
| plain_language | 16 | 12 | 0.75 | 0.71 |
| ANSWERABLE | 29 | 25 | 0.86 | 0.84 |
| unanswerable | 9 | 8 | 0.89 | n/a |

Misses:
- `goldset-021` (plain_language) expected ['148/2019 Art. 1'], got ['148/2019 Art. 21']
- `goldset-025` (plain_language) expected ['43/1979 Art. 1'], got nothing
- `goldset-028` (plain_language) expected ['4/1994 Art. 2'], got ['4/1994 Art. 5']
- `goldset-029` (plain_language) expected ['17/1983 Art. 76'], got ['17/1983 Art. 37']
- `goldset-030` (unanswerable) expected nothing, got ['12/2003 Art. 33', '14/2025 Art. 86']


## 2026-07-31

embed=`nvidia:nvidia/nemotron-3-embed-1b` · expand=`nvidia:meta/llama-3.3-70b-instruct` · rerank=`nvidia:meta/llama-3.3-70b-instruct` · answer=`nvidia:meta/llama-3.3-70b-instruct`

Gold set: 38 entries (29 answerable, 9 unanswerable).

### lexical only

| category | n | hits | recall@8 | MRR |
| --- | --- | --- | --- | --- |
| exact_citation | 13 | 12 | 0.92 | 0.92 |
| plain_language | 16 | 9 | 0.56 | 0.41 |
| ANSWERABLE | 29 | 21 | 0.72 | 0.64 |
| unanswerable | 9 | 7 | 0.78 | n/a |

Misses:
- `goldset-003` (exact_citation) expected ['131/1948 Art. 1'], got nothing
- `goldset-023` (plain_language) expected ['12/2003 Art. 111'], got ['148/2019 Art. 14', '252/1959 Art. 19', '93/2003 Art. 33']
- `goldset-024` (plain_language) expected ['159/1981 Art. 1'], got nothing
- `goldset-025` (plain_language) expected ['43/1979 Art. 1'], got nothing
- `goldset-026` (plain_language) expected ['88/2003 Art. 5'], got nothing
- `goldset-027` (plain_language) expected ['181/2018 Art. 2'], got nothing
- `goldset-028` (plain_language) expected ['4/1994 Art. 2'], got nothing
- `goldset-029` (plain_language) expected ['17/1983 Art. 76'], got nothing
- `goldset-032` (unanswerable) expected nothing, got ['159/1981 Art. 89', '18/2015 Art. 15', '81/2016 Art. 14']
- `goldset-033` (unanswerable) expected nothing, got ['50/1977 Art. 30', '118/1976 Art. 66', '137/2010 Art. 2']

### lexical + vectors

| category | n | hits | recall@8 | MRR |
| --- | --- | --- | --- | --- |
| exact_citation | 13 | 13 | 1.00 | 1.00 |
| plain_language | 16 | 15 | 0.94 | 0.81 |
| ANSWERABLE | 29 | 28 | 0.97 | 0.90 |
| unanswerable | 9 | 2 | 0.22 | n/a |

Misses:
- `goldset-023` (plain_language) expected ['12/2003 Art. 111'], got ['148/2019 Art. 14', '12/2003 Art. 104', '252/1959 Art. 19']
- `goldset-030` (unanswerable) expected nothing, got ['12/2003 Art. 33', '14/2025 Art. 86', '18/2015 Art. 17']
- `goldset-031` (unanswerable) expected nothing, got ['67/2016 Art. 3', '67/2016 Art. 74', '67/2016 Art. 1']
- `goldset-032` (unanswerable) expected nothing, got ['16/2018 Art. 17', '71/2017 Art. 83', '181/2018 Art. 72']
- `goldset-033` (unanswerable) expected nothing, got ['50/1977 Art. 30', '131/1948 Art. 13', '131/1948 Art. 28']
- `goldset-036` (unanswerable) expected nothing, got ['17/1983 Art. 204', '141/2020 Art. 3', '46/2014 Art. 4']
- `goldset-037` (unanswerable) expected nothing, got ['25/1966 Art. 35', '162/1958 Art. 3 مكررًا (ب)', '25/1966 Art. 33']
- `goldset-038` (unanswerable) expected nothing, got ['159/1981 Art. 129 مكررًا / 1', '159/1981 Art. 17', '159/1981 Art. 4']

### lexical + expansion + rerank (no vectors)

| category | n | hits | recall@8 | MRR |
| --- | --- | --- | --- | --- |
| exact_citation | 13 | 13 | 1.00 | 1.00 |
| plain_language | 16 | 8 | 0.50 | 0.46 |
| ANSWERABLE | 29 | 21 | 0.72 | 0.70 |
| unanswerable | 9 | 5 | 0.56 | n/a |

Misses:
- `goldset-019` (plain_language) expected ['82/2002 Art. 2'], got nothing
- `goldset-021` (plain_language) expected ['148/2019 Art. 1'], got nothing
- `goldset-024` (plain_language) expected ['159/1981 Art. 1'], got nothing
- `goldset-025` (plain_language) expected ['43/1979 Art. 1'], got ['106/1976 Art. 36', '12/1984 Art. 104', '35/1978 Art. 116']
- `goldset-026` (plain_language) expected ['88/2003 Art. 5'], got nothing
- `goldset-027` (plain_language) expected ['181/2018 Art. 2'], got nothing
- `goldset-028` (plain_language) expected ['4/1994 Art. 2'], got ['4/1994 Art. 5', '4/1994 Art. 15', '4/1994 Art. 1']
- `goldset-029` (plain_language) expected ['17/1983 Art. 76'], got nothing
- `goldset-030` (unanswerable) expected nothing, got ['12/2003 Art. 80', '12/2003 Art. 201', '12/2003 Art. 82']
- `goldset-031` (unanswerable) expected nothing, got ['67/2016 Art. 39', '67/2016 Art. 10', '67/2016 Art. 1']
- `goldset-032` (unanswerable) expected nothing, got ['159/1981 Art. 89', '18/2015 Art. 15', '81/2016 Art. 14']
- `goldset-033` (unanswerable) expected nothing, got ['50/1977 Art. 30', '118/1976 Art. 66', '137/2010 Art. 2']

### full pipeline (vectors + expansion + rerank)

| category | n | hits | recall@8 | MRR |
| --- | --- | --- | --- | --- |
| exact_citation | 13 | 13 | 1.00 | 1.00 |
| plain_language | 16 | 15 | 0.94 | 0.81 |
| ANSWERABLE | 29 | 28 | 0.97 | 0.90 |
| unanswerable | 9 | 2 | 0.22 | n/a |

Misses:
- `goldset-023` (plain_language) expected ['12/2003 Art. 111'], got ['148/2019 Art. 14', '12/2003 Art. 104', '252/1959 Art. 19']
- `goldset-030` (unanswerable) expected nothing, got ['12/2003 Art. 33', '14/2025 Art. 86', '18/2015 Art. 17']
- `goldset-031` (unanswerable) expected nothing, got ['67/2016 Art. 3', '67/2016 Art. 74', '67/2016 Art. 1']
- `goldset-032` (unanswerable) expected nothing, got ['16/2018 Art. 17', '71/2017 Art. 83', '181/2018 Art. 72']
- `goldset-033` (unanswerable) expected nothing, got ['50/1977 Art. 30', '131/1948 Art. 13', '131/1948 Art. 28']
- `goldset-036` (unanswerable) expected nothing, got ['17/1983 Art. 204', '141/2020 Art. 3', '46/2014 Art. 4']
- `goldset-037` (unanswerable) expected nothing, got ['25/1966 Art. 35', '162/1958 Art. 3 مكررًا (ب)', '25/1966 Art. 33']
- `goldset-038` (unanswerable) expected nothing, got ['159/1981 Art. 129 مكررًا / 1', '159/1981 Art. 17', '159/1981 Art. 4']


