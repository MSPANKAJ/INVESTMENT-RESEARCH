"""Deterministic financial-data quality checks; not a trading recommendation engine."""
from __future__ import annotations
from datetime import datetime
from math import isfinite
from urllib.parse import urlparse

INPUT_KEYS = ("revenueGrowth", "epsGrowth", "roe", "debtEquity", "pe", "fcfPositive")


def parse_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (ValueError, TypeError):
        return None
    return round(number, 3) if isfinite(number) and abs(number) < 1e12 else None


def is_http_url(value):
    if not isinstance(value, str):
        return False
    parsed = urlparse(value.strip())
    return parsed.scheme == "https" and bool(parsed.netloc) and not parsed.username


def quality_report(prices, articles, financials):
    """Score completeness of research input, explicitly NOT investment attractiveness."""
    prices = prices or []
    articles = articles or []
    financials = financials or {}
    metrics_present = sum(1 for k in INPUT_KEYS if financials.get(k) is not None and financials.get(k) != "")
    sources = financials.get("sourceUrls") or []
    verified_source_count = sum(1 for source in sources if is_http_url(source))
    # These are heuristic coverage weights, not probability or predictive accuracy.
    components = {
        "Daily prices": 15 if len(prices) >= 50 else 7 if prices else 0,
        "Recent news": 10 if len(articles) >= 3 else 5 if articles else 0,
        "Financial ratios": round(30 * metrics_present / len(INPUT_KEYS)),
        "Cited filings": 25 if verified_source_count >= 2 else 12 if verified_source_count == 1 else 0,
        "Historical financials": 10 if financials.get("historicalYears") and parse_number(financials.get("historicalYears")) >= 3 else 0,
        "Management/thesis context": 10 if (financials.get("managementNotes") or "").strip() else 0,
    }
    score = sum(components.values())
    missing = []
    if not prices: missing.append("Market-data API / verified closing prices")
    if not articles: missing.append("Recent company news")
    if metrics_present < 5: missing.append("At least five financial metrics from dated filings")
    if verified_source_count < 2: missing.append("Two linked official filings or investor-relations sources")
    if not financials.get("historicalYears") or (parse_number(financials.get("historicalYears")) or 0) < 3:
        missing.append("Three years of comparable financial history")
    if not (financials.get("managementNotes") or "").strip(): missing.append("Management commentary / investment thesis")
    return {
        "score": score,
        "label": "Research data coverage — not an investment score",
        "components": components,
        "missing": missing,
        "researchReady": score >= 75 and verified_source_count >= 2 and bool(prices),
        "verdict": "Enough inputs for a preliminary thesis review" if score >= 75 and verified_source_count >= 2 and bool(prices) else "Insufficient evidence for a defensible buy/sell assessment",
    }


def analytical_flags(financials):
    """Surfacing watch-outs, no recommendations. Sector differences are explicitly cautioned."""
    result=[]
    pe = parse_number(financials.get("pe"))
    roe = parse_number(financials.get("roe"))
    debt = parse_number(financials.get("debtEquity"))
    eps_growth = parse_number(financials.get("epsGrowth"))
    rev_growth = parse_number(financials.get("revenueGrowth"))
    if pe is not None and pe <= 0:
        result.append("Non-positive P/E: assess loss-making or unusual earnings before using earnings multiples.")
    if pe is not None and pe >= 35:
        result.append("High P/E: growth expectations need strong support from normalized earnings.")
    if eps_growth is not None and eps_growth < 0:
        result.append("Negative EPS growth: distinguish temporary earnings pressure from structural decline.")
    if rev_growth is not None and rev_growth < 0:
        result.append("Declining revenue: investigate demand, competition and business mix.")
    if roe is not None and roe < 10:
        result.append("ROE below 10%: examine capital efficiency and exceptional items.")
    if debt is not None and debt > 1.5:
        result.append("Debt/equity above 1.5: investigate leverage and refinancing; banking ratios differ.")
    if financials.get("fcfPositive") is False:
        result.append("Negative free cash flow: determine whether driven by capex or operational weakness.")
    if not result:
        result.append("No simple numeric red flags detected. This does not imply a good investment.")
    return result
