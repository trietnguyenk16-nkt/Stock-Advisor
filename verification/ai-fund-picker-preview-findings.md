# AI and fund picker preview findings — 2026-08-16

The local preview now exposes a `Bắt đầu phân tích AI` button in the AI panel. The picker’s Quỹ tab renders ETF entries plus DCDS and VCBF-BCF/VCBF-MGF/VCBF-AIF/VCBF-TBF/VCBF-FIF, with source labels such as `Quỹ mở · Fmarket` and `Quỹ mở · Fmarket/VCBF`. The local preview remains configured without production OpenAI, so the button is shown disabled with the setup state until Vercel has `OPENAI_API_KEY` and Supabase configuration.
