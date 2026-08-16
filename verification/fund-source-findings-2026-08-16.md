# Fund source verification — 2026-08-16

CafeF public pages were checked directly. `https://cafef.vn/du-lieu/chung-chi-quy/DCDS.chn` returned `Giá NAV (ngày 16-08-2026): 93,969.17 VNĐ`; `https://cafef.vn/du-lieu/chung-chi-quy/VCBF-BCF.chn` returned `41,536.04 VNĐ`. The page for `SSISCA` returned a placeholder NAV `0.00`, while the variant `https://cafef.vn/du-lieu/chung-chi-quy/SSI-SCA.chn` returned a valid NAV `39,562.82`.

Fmarket's public fund list `https://fmarket.vn/danh-sach-quy` lists DCDS, VCBF-BCF, VCBF-MGF, SSISCA and other open-ended funds. The public homepage `https://fmarket.vn/` displays recent NAV examples and its bundle identifies `https://api.fmarket.vn` as the API base; direct product API calls require authentication, so the implementation keeps CafeF as the server-side public NAV source and adds code normalization/fallback candidates rather than fabricating Fmarket values.

The official VCBF page `https://www.vcbf.com/en/open-ended-funds/open-ended-funds-of-vcbf/vcbf-blue-chip-fund/` identifies VCBF-BCF and publishes NAV/Unit when available, but the extracted page currently showed `--` for NAV/Unit and links to historical NAV documents. The implementation therefore uses CafeF for current public server-side parsing and records source metadata.
