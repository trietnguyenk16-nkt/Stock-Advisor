# Project TODO

- [x] Tạo issue triển khai trên repository Stock-Advisor cho các nhóm chức năng chính
- [x] Thiết kế schema lưu tài sản theo dõi, giá lịch sử, tin tức, phân tích AI và trạng thái đồng bộ
- [x] Tạo dashboard một màn hình với bố cục elegant, responsive và trạng thái loading/empty/error
- [x] Cho phép thêm và xóa tài sản theo mã ticker cho cổ phiếu, chứng chỉ quỹ và vàng
- [x] Hiển thị giá hiện tại, phần trăm biến động và thời điểm cập nhật gần nhất
- [x] Tích hợp nguồn dữ liệu giá công khai và chuẩn hóa mã tài sản
- [x] Tích hợp tổng hợp tin tức công khai theo từng tài sản
- [x] Tích hợp phân tích AI có nhận định, tín hiệu mua/bán/giữ, mức giá tham khảo và rủi ro
- [x] Xây dựng heartbeat/cron chạy đúng chu kỳ 2 giờ theo UTC và bảo đảm idempotent — Heartbeat Manus và CLI/systemd timer VPS đã có
- [x] Tích hợp email digest đồng bộ với mỗi lần cập nhật 2 giờ — cần nhập secrets để gửi thật
- [x] Thêm cấu hình email nhận báo cáo và thông tin hiển thị trong dashboard — cần nhập ALERT_EMAIL/RESEND_API_KEY
- [x] Viết Vitest cho schema, watchlist, dữ liệu giá/tin tức, phân tích AI và scheduled handler — đã có contract/provider/CLI/PWA tests; live provider cần secrets/network
- [x] Kiểm tra typecheck, test, build và xác minh dashboard trên desktop/mobile
- [x] Lưu checkpoint cuối cùng và bàn giao phiên bản cho người dùng

- [x] Thu hẹp asset universe chỉ còn cổ phiếu Việt Nam, chứng chỉ quỹ Việt Nam và giá vàng tại Việt Nam
- [x] Khảo sát và xác minh nguồn dữ liệu Việt Nam cho giá cổ phiếu, chứng chỉ quỹ và vàng
- [x] Ghi nhận nguồn ưu tiên, phương án fallback, giới hạn truy cập và điều khoản sử dụng dữ liệu
- [x] Tạo issue triển khai adapter dữ liệu thị trường Việt Nam và chuẩn hóa ticker theo từng loại tài sản
- [x] Tạo issue triển khai nguồn tin tức Việt Nam và liên kết bài viết gốc
- [x] Tạo issue kiểm thử độ đầy đủ, timestamp, rate limit và fallback của nguồn dữ liệu Việt Nam

- [x] Thiết kế bảng asset watchlist, price snapshots, sync runs và email delivery
- [x] Tạo provider backend cho cổ phiếu Việt Nam, NAV quỹ Việt Nam và vàng trong nước — có metadata nguồn/freshness và parser test; cần theo dõi thay đổi HTML nguồn
- [x] Tạo sync pipeline idempotent theo taskUid/run key và lưu trạng thái lỗi — đã có claim runKey, email dedupe và CLI task UID
- [x] Tạo scheduled endpoint /api/scheduled/sync-market chạy mỗi 2 giờ theo UTC — endpoint và CLI VPS đều đã có
- [x] Tạo email digest HTML và gửi qua Resend khi có RESEND_API_KEY/ALERT_EMAIL — code đã có, chờ cấu hình secrets
- [x] Bổ sung test cho provider, idempotency, scheduled handler và email fallback — có parser/provider/CLI/PWA tests và graceful fallback khi thiếu email config

- [x] Tạo issue quy trình deploy app bằng Manus hosting, không sử dụng Dockerfile
- [x] Tạo issue chuyển dashboard thành PWA dùng được trên điện thoại
- [x] Tạo manifest, service worker, icon, install prompt và offline fallback cho PWA
- [x] Kiểm thử PWA trên viewport mobile và các tiêu chí Lighthouse cơ bản

- [x] Tạo CLI entrypoint chạy syncMarket trực tiếp không qua HTTP
- [x] Thêm build output cho CLI và script `pnpm sync:market`
- [x] Hỗ trợ runKey theo taskUid hoặc cửa sổ 2 giờ khi chạy trên VPS
- [x] Viết test cho CLI exit code, idempotency và lỗi email/provider
- [x] Cập nhật hướng dẫn systemd timer/cron để gọi CLI độc lập

- [x] Thêm manifest PWA, metadata mobile và icon cài đặt
- [x] Thêm service worker cache shell an toàn và offline fallback
- [x] Thêm install prompt/instruction và trạng thái offline trong dashboard
- [x] Tối ưu responsive mobile, safe-area và vùng chạm
- [x] Viết test/checklist PWA, chạy typecheck/test/build và chụp mobile preview
- [x] Tạo checkpoint PWA và push code lên GitHub repository

- [x] Rà soát toàn bộ issue GitHub còn mở và đối chiếu với implementation hiện tại
- [x] Tạo issue deploy Oracle Cloud Always Free với systemd timer mỗi 2 giờ, không Docker, không Vercel Pro
- [x] Hoàn thiện các hạng mục backend còn thiếu và test end-to-end — test tự động pass; live external integration cần secrets
- [x] Hoàn thiện tài liệu deploy miễn phí và checklist vận hành production
- [x] Đóng các issue đã hoàn thành, tạo checkpoint cuối và push mọi thay đổi lên GitHub — issue #16 còn mở để người dùng tạo VM

- [x] Soạn hướng dẫn tạo Oracle Cloud VM Ubuntu cho Stock Advisor
- [x] Soạn hướng dẫn SSH, firewall, Node.js/pnpm, build và systemd service
- [x] Soạn hướng dẫn biến môi trường, quyền file secrets và kiểm tra cấu hình
- [x] Soạn hướng dẫn systemd timer chạy CLI sync mỗi 2 giờ và checklist xử lý lỗi

- [x] Chuyển issue deploy sang Vercel Cron, không dùng Oracle systemd timer làm mặc định
- [x] Thêm file cấu hình lịch cron có thể chỉnh bởi người dùng
- [x] Đặt mặc định sync mỗi ngày lúc 18:00 giờ Việt Nam, tương đương 11:00 UTC
- [x] Thêm vercel.json route cron bảo vệ bằng CRON_SECRET và gọi pipeline phù hợp
- [x] Viết test cho timezone conversion và cấu hình lịch
- [x] Cập nhật tài liệu/issue Vercel, chạy test/build, checkpoint và push GitHub

- [x] Thêm mutation đồng bộ thị trường thủ công có bảo vệ chống chạy trùng
- [x] Thêm lưu subscription và gửi Push Notification cho PWA — yêu cầu VAPID secrets để bật gửi thật
- [x] Thêm API lịch sử sync và trạng thái email delivery gần nhất
- [x] Thêm nút đồng bộ thủ công và trạng thái tiến trình trên dashboard
- [x] Thêm UI xin quyền/cài Push Notification và trạng thái đã bật/tắt
- [x] Thêm trang dashboard history cho sync/email
- [x] Viết test cho manual sync, push subscription, history và PWA flows
- [x] Chạy typecheck/test/build, chụp mobile preview, checkpoint và push GitHub — test/build pass; checkpoint cho migration đã lưu

- [x] Tạo issue migration database từ MySQL/TiDB sang Supabase PostgreSQL — đã chuẩn bị migration additive-only riêng schema
- [x] Xác định biến môi trường Supabase/Vercel và connection pooler
- [x] Chuyển schema Drizzle từ mysql-core sang pg-core — chưa tự động áp dụng; cần thực hiện sau khi xác nhận DATABASE_URL Supabase đích
- [x] Tạo SQL migration Supabase cho watchlist, snapshots, news, analysis, sync, email và push subscriptions
- [x] Thiết lập RLS tối thiểu cho workspace owner, không bật Supabase Auth — giữ server-only schema riêng, không expose Data API
- [x] Viết kiểm tra kết nối và hướng dẫn seed/backup Supabase

- [x] Chọn namespace/table prefix riêng cho Stock Advisor trên database dùng chung
- [x] Tạo migration PostgreSQL chỉ CREATE schema/table/index mới, không DROP/ALTER table cũ
- [x] Tạo script kiểm tra table/index đã tồn tại và danh sách object được tạo
- [x] Tạo rollback script chỉ xóa object Stock Advisor với xác nhận thủ công
- [x] Viết hướng dẫn dry-run, backup và chạy migration trên Supabase SQL Editor/CLI
- [x] Bổ sung quy trình backup schema/dữ liệu và xác minh khả năng restore trước migration Supabase dùng chung

- [x] Soạn checklist deploy checkpoint 8d90fda1 lên Vercel với GitHub main
- [x] Hướng dẫn chạy migration additive-only trong Supabase database dùng chung
- [x] Hướng dẫn cấu hình toàn bộ Vercel Environment Variables cho database, cron, email và push
- [x] Hướng dẫn kiểm tra Vercel Cron 11:00 UTC, manual sync, history và Push Notification

- [x] Chuyển database driver từ mysql2 sang PostgreSQL cho Supabase pooler
- [x] Chuyển Drizzle schema từ mysql-core sang pg-core và namespace stock_advisor
- [x] Cập nhật db helpers, migrations và config để không dùng bảng public/users của project khác
- [x] Thêm seed/ensure workspace owner và kiểm tra kết nối Supabase
- [x] Cập nhật Vercel env/docs, chạy test/build và push migration runtime lên GitHub

- [x] Thêm OpenAI API key server-side qua `OPENAI_API_KEY` và cấu hình model mặc định
- [x] Cho phép chọn `gpt-4o-mini` hoặc `gpt-5-mini` trong dashboard và lưu lựa chọn an toàn
- [x] Dùng model được chọn trong phân tích AI của sync pipeline, không expose API key ở frontend
- [x] Viết test cho model config, OpenAI fallback/error handling và UI contract
- [x] Cập nhật hướng dẫn Vercel, chạy typecheck/test/build và lưu checkpoint

- [x] Thêm rollback và thông báo lỗi khi lưu model AI thất bại; xác minh persistence sau refresh
- [x] Bổ sung test OpenAI error path, ai procedure contract và sync pipeline đọc model từ ai_settings
- [x] Đồng bộ các guide Supabase còn lại với ai_settings và OPENAI_API_KEY; tạo checkpoint OpenAI mới

- [x] Bổ sung Vitest cho `appRouter.ai.config` và `appRouter.ai.setModel`
- [x] Bổ sung test xác nhận sync pipeline lấy model từ `ai_settings` và truyền vào OpenAI helper

- [x] Mock OpenAI helper trong syncMarket test để xác nhận model từ ai_settings được truyền đúng khi phân tích tài sản

- [x] Đồng bộ checkpoint OpenAI mới nhất lên GitHub repository `trietnguyenk16-nkt/Stock-Advisor` và xác minh commit remote

- [x] Khắc phục domain Vercel đang hiển thị source code thay vì UI và xác minh production render

- [ ] Redeploy trên Vercel và xác minh domain production render UI, route `/history` và API `/api/cron/sync-market`

- [x] Bổ sung và kiểm thử Vercel serverless tRPC route để AI config đọc được OPENAI_API_KEY trên production

- [ ] Sửa lỗi HTTP 500 trên Vercel `/api/trpc/*`, kiểm tra OpenAI config, market quote và push config production

- [x] Cô lập lỗi runtime Vercel function sau deployment mới và thay handler tRPC bằng adapter tối giản có fallback an toàn

- [ ] Sửa OpenAI status trên Vercel và bảo đảm manual sync cập nhật dữ liệu rồi refresh các query dashboard

- [x] Thay Vercel tRPC catch-all đang crash bằng dispatcher tối giản cho AI config, quote, manual sync và push config

- [ ] Tự rà soát và gia cố production Vercel để AI config và manual sync hoạt động mà không cần người dùng kiểm tra ngay

- [x] Tách các endpoint production trực tiếp cho AI config, model selection, quote, manual sync, history và push config
- [x] Cập nhật frontend dùng các endpoint trực tiếp thay vì phụ thuộc batch tRPC catch-all
- [x] Thêm test request/response contract cho direct API endpoints và frontend không phụ thuộc tRPC catch-all
- [ ] Redeploy bản mới nhất và xác minh code path production; nếu không có domain/credentials thì ghi rõ bước người dùng cần thực hiện

- [x] Rà soát toàn bộ Vercel entrypoints và cô lập import gây FUNCTION_INVOCATION_FAILED
- [x] Thiết kế lại API production và manual sync handler an toàn, có timeout và JSON error rõ ràng
- [ ] Chạy toàn bộ validation, tạo một checkpoint phát hành duy nhất và push GitHub
- [ ] Xác minh deployment mới trên domain Vercel và hoàn tất production checklist
