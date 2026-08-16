# Production data source findings — 2026-08-16

## VCBF official fund source

URL: https://www.vcbf.com/en/open-ended-funds/open-ended-funds-of-vcbf/vcbf-blue-chip-fund/

The official VCBF page identifies the fund symbol as `VCBF-BCF`, describes it as invested in listed equities with large market capitalization and good liquidity, and exposes the NAV/Unit field. The page also links the related VCBF-MGF, VCBF-AIF, VCBF-TBF and VCBF-FIF funds.

## Existing code sources

The current server provider uses CafeF for fund NAV at `https://cafef.vn/du-lieu/chung-chi-quy/{providerCode}.chn`, SJC/PNJ/DOJI public pages for gold, and HOSE/HNX public pages for equities. The direct manual-sync handler now uses CafeF NAV for funds and the PNJ SJC API for gold, with Yahoo chart reserved for equities; this closes the previous fund-data and SJC-source mismatch.

The direct AI endpoint currently fetches Yahoo Finance search news by provider symbol and uses timestamped `price_snapshots`. Its client mapping uses `result.analyzed` and `result.model`; the production screenshot showing `undefined` indicates the live response/deployment contract is stale or missing those fields and requires a defensive client fallback plus response normalization.

## Direct availability check

On 2026-08-16, direct HTTP checks returned: Yahoo Finance VNM.VN HTTP 200 (1,419 bytes); CafeF DCDS HTTP 200 (125,309 bytes); CafeF VCBF-BCF HTTP 200 (125,461 bytes); SJC official site HTTP 403 (5,341 bytes); PNJ gold page HTTP 200 (9,766 bytes); DOJI HTTP 200 (137,882 bytes).

The implementation therefore routes equities to Yahoo Finance chart data, funds to CafeF NAV pages, and SJC gold to the PNJ public API with SJC/PNJ/DOJI HTML fallbacks. The stored source metadata now names PNJ SJC API when that endpoint succeeds.
