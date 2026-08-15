Persistence verification (2026-08-15):
After selecting gpt-5-mini, reloading the dashboard and waiting for the AI config query caused the dropdown to restore gpt-5-mini. The status showed “OpenAI đã sẵn sàng”, confirming the selected model is persisted in Supabase ai_settings and not only held in React state.
