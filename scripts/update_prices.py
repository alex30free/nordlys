"""
Downloads daily closing prices for every company in data/companies.json
(and their benchmark indexes) from Yahoo Finance, and saves them as small
JSON files in data/prices/ that the website reads.

GitHub runs this automatically every weekday evening
(see .github/workflows/update-prices.yml). You can also run it yourself:

    pip install yfinance
    python scripts/update_prices.py
"""

import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "prices"
YEARS = 11  # enough for the 10Y chart and the 200-day average


def safe_name(s: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in s)


def download(symbol: str):
    """Returns (dates, closes, ticker) or None if Yahoo has no data."""
    t = yf.Ticker(symbol)
    hist = t.history(period=f"{YEARS}y", interval="1d", auto_adjust=False)
    if hist is None or hist.empty or "Close" not in hist:
        return None
    hist = hist.dropna(subset=["Close"])
    dates = [d.strftime("%Y-%m-%d") for d in hist.index]
    closes = [round(float(v), 4) for v in hist["Close"].tolist()]
    return dates, closes, t


def trailing_dividend_yield(t, last_close):
    """Dividends paid per share over the last 365 days / latest price, in %."""
    try:
        div = t.dividends
        if div is None or div.empty or not last_close:
            return None
        cutoff = datetime.now(timezone.utc) - timedelta(days=365)
        idx = div.index
        if idx.tz is None:
            idx = idx.tz_localize("UTC")
        recent = div[idx >= cutoff]
        total = float(recent.sum())
        return round(total / last_close * 100, 2)
    except Exception as e:  # noqa: BLE001
        print(f"    dividend yield not available: {e}")
        return None


def market_cap(t):
    try:
        v = t.fast_info.get("marketCap") if hasattr(t.fast_info, "get") else t.fast_info["marketCap"]
        return float(v) if v and not math.isnan(float(v)) else None
    except Exception:  # noqa: BLE001
        return None


def write(path: Path, payload: dict):
    path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    companies = json.loads((DATA / "companies.json").read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    failures = []

    for c in companies:
        if c.get("demo"):
            continue  # sample company uses made-up prices
        sym = c.get("yahoo")
        if not sym:
            print(f"- {c['id']}: no 'yahoo' symbol in companies.json, skipped")
            continue
        print(f"- {c['id']} ({sym})")
        try:
            res = download(sym)
            if not res:
                raise RuntimeError("Yahoo returned no data – check the 'yahoo' symbol")
            dates, closes, t = res
            last = closes[-1]
            payload = {
                "id": c["id"],
                "symbol": sym,
                "currency": c.get("currency"),
                "updated": now,
                "last_date": dates[-1],
                "last_close": last,
                "prev_close": closes[-2] if len(closes) > 1 else None,
                "market_cap": market_cap(t),
                "dividend_yield_pct": trailing_dividend_yield(t, last),
                "dates": dates,
                "close": closes,
            }
            write(OUT / f"{safe_name(c['id'])}.json", payload)
            print(f"    ok – {len(dates)} days, last close {last} on {dates[-1]}")
        except Exception as e:  # noqa: BLE001  keep the old file if something fails
            print(f"    FAILED: {e}")
            failures.append(c["id"])

    for sym in sorted({c.get("benchmark") for c in companies if c.get("benchmark") and not c.get("demo")}):
        print(f"- index {sym}")
        try:
            res = download(sym)
            if not res:
                raise RuntimeError("Yahoo returned no data – check the 'benchmark' symbol")
            dates, closes, _ = res
            write(OUT / f"index_{safe_name(sym)}.json", {"symbol": sym, "updated": now, "dates": dates, "close": closes})
            print(f"    ok – {len(dates)} days")
        except Exception as e:  # noqa: BLE001
            print(f"    FAILED: {e}")
            failures.append(sym)

    if failures:
        print("\nCould not update: " + ", ".join(failures))
    # Only fail the run if nothing at all worked
    real = [c for c in companies if not c.get("demo")]
    return 1 if real and len(failures) >= len(real) else 0


if __name__ == "__main__":
    sys.exit(main())
