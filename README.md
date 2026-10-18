# Northstar — Indian investment research POC (free-first)

A **working local web app** for research-testing only: choose an Indian stock, retrieve EOD price bars and recent (delayed) news, enter verified financial metrics from primary-source reports, inspect research completeness and deterministic warning signs, and optionally ask Gemini to draft a skeptical thesis.

**Not** a live trading platform, public website, licensed market-data redistributor, portfolio accounting service, autonomous investment adviser, or guaranteed forecasting system. Do not use results as trading instructions.

## Quick start — Mac, Windows, Linux

**Requirements:** Python 3.10+; no `pip install`, `npm install`, or database needed.

1. Download and unzip the project.
2. On a Mac, double-click **`run.command`**, or open Terminal / Claude Code inside the folder and run:

   ```bash
   python3 server.py
   ```

   Windows: double-click `run.bat` or run `py -3 server.py`.
3. Open **http://127.0.0.1:8765** in your browser.
4. Select **Fictional demo** to see the UI immediately without any API key. All demo numbers and stories are **simulated and fictional**.
5. For actual prices and news, copy `.env.example` to `.env`, then enter API keys from:
   - EODHD: https://eodhd.com/register
   - GNews: https://gnews.io/
   - Gemini (optional): https://aistudio.google.com/apikey
6. Restart the server, choose `INFY` (or another supported stock), and click **Refresh research**.
7. Enter real financial figures from dated company disclosures plus **two original public source links**, then click **Save inputs**. Save them per stock on this browser. Once enough evidence exists, optionally click **Generate research thesis**.

**No passwords or credit card are required by the app itself.** Each external provider has its own registration and terms.

## What the free providers do / do not provide

| Source | Use | Free limits / restriction |
|---|---|---|
| EODHD | Exchange closing-price bars | 20 API calls/day, past 1 year, personal-use; as published by provider. Paid tier needed for deeper history. |
| GNews | Recent headlines and links | 100 requests/day, 10 results/request, **12-hour delay**, 30-day history, development/non-commercial only. Not a live feed. |
| Gemini 2.5 Flash | Optional thesis drafting | Free usage tier / quotas; **free-tier inputs may be used to improve provider products**. Do not submit private portfolio/financial information. |
| Official issuer, NSE/BSE disclosures | Human-verified financial inputs | Public websites; automated scraping/licensing not included. You enter figures yourself. |

Free feeds are research *inputs*, not a complete investing intelligence solution. EODHD bars are priced in INR for India exchange equities where supported. Confirm each symbol and adjusted/corporate-action handling before serious backtesting.

## Important reliability guardrails

- **Market prices**: fetch real data only from EODHD with a user-provided key. No fictional fallback for real tickers. Six-hour in-memory cache reduces quota use. Show last actual price date, not a bogus 'live' status.
- **News**: fetching GNews headlines does **not** prove their assertions; full text and latest 12 hours are unavailable on the free plan. Opening a headline links to publisher. 45-minute in-memory cache.
- **Financials**: manually entered data are **user-provided, not independently verified** by this app. Always cite real filings, and compare periods appropriately. Two HTTPS links are required for research readiness; URL syntax is checked, but content and authenticity are NOT verified.
- **Data coverage /100** is **input completeness**, NOT a confidence percentage, success rate, backtested performance, valuation score, or recommended buy rating.
- **AI**: disabled unless a real stock, EOD prices, and enough dated, sourced metrics exist. A no-key mode is fully usable for UI, market-data and evidence-workflow testing. No model may promise near-accurate forecasts. Research is expressly conditional.
- **Device-local research data**: saves to `localStorage` in this browser (not encrypted; no account sync). This is suitable for publicly available research figures only. Do not enter private holdings or account details.
- **API keys**: kept in `.env` on local server and never sent to browser. `.env` is ignored by Git; never commit it.
- **Security**: intentionally binds only to `127.0.0.1`, without login. **Do not deploy this as-is** or expose it to your local network/internet. Add real authentication, HTTPS, authorization, rate limits and secured storage first. It works in a mobile-sized browser; remote phone access comes after secure deployment.
- **No trading**: this app cannot place orders or access a demat/bank account.

## How we decide if the direction is working

Test at least three diverse stocks (e.g. INFY, ICICIBANK, RELIANCE):

1. Are symbol mappings correct? Verify EOD closing prices/dates against NSE.
2. Are news headlines relevant and timely enough? Note missing important events and false positives.
3. Can you enter 3 years of comparable financials and cite dated company reports?
4. Does the AI state both bull/bear cases, surface missing evidence, and avoid invented numbers and citations?
5. Does a human investor find the report useful enough to investigate further? Keep scorecards and examples for repeated evaluation.

**Next phase**, only if this pilot succeeds: 3–10 years of fundamentals, automated official-filing ingestion under permitted terms, structured valuation models (DCF, sector-specific bank models, scenario assumptions), real news licensing, historical point-in-time backtesting, and secure mobile deployment.

## Source architecture

```
server.py          # local stdlib-only HTTP/API server, caching, provider calls and Gemini
research.py        # deterministic data coverage and warnings, unit-tested
static/index.html  # responsive interface
static/style.css   # app styling
static/app.js      # UI, charts, browser-only manual financial inputs
.env.example       # provider keys (never include real keys in source)
tests/             # validation tests
```

For a future production PWA, we can migrate the validated logic into Next.js / Supabase once the research methodology proves useful.
