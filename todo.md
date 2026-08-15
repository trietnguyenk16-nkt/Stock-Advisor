# Project TODO

- [x] Tạo issue triển khai trên repository Stock-Advisor cho các nhóm chức năng chính
- [ ] Thiết kế schema lưu tài sản theo dõi, giá lịch sử, tin tức, phân tích AI và trạng thái đồng bộ
- [x] Tạo dashboard một màn hình với bố cục elegant, responsive và trạng thái loading/empty/error
- [x] Cho phép thêm và xóa tài sản theo mã ticker cho cổ phiếu, chứng chỉ quỹ và vàng
- [x] Hiển thị giá hiện tại, phần trăm biến động và thời điểm cập nhật gần nhất
- [x] Tích hợp nguồn dữ liệu giá công khai và chuẩn hóa mã tài sản
- [x] Tích hợp tổng hợp tin tức công khai theo từng tài sản
- [x] Tích hợp phân tích AI có nhận định, tín hiệu mua/bán/giữ, mức giá tham khảo và rủi ro
- [ ] Xây dựng heartbeat/cron chạy đúng chu kỳ 2 giờ theo UTC và bảo đảm idempotent
- [ ] Tích hợp email digest đồng bộ với mỗi lần cập nhật 2 giờ
- [ ] Thêm cấu hình email nhận báo cáo và thông tin hiển thị trong dashboard
- [ ] Viết Vitest cho schema, watchlist, dữ liệu giá/tin tức, phân tích AI và scheduled handler
- [ ] Kiểm tra typecheck, test, build và xác minh dashboard trên desktop/mobile
- [ ] Lưu checkpoint cuối cùng và bàn giao phiên bản cho người dùng

- [x] Thu hẹp asset universe chỉ còn cổ phiếu Việt Nam, chứng chỉ quỹ Việt Nam và giá vàng tại Việt Nam
- [x] Khảo sát và xác minh nguồn dữ liệu Việt Nam cho giá cổ phiếu, chứng chỉ quỹ và vàng
- [x] Ghi nhận nguồn ưu tiên, phương án fallback, giới hạn truy cập và điều khoản sử dụng dữ liệu
- [x] Tạo issue triển khai adapter dữ liệu thị trường Việt Nam và chuẩn hóa ticker theo từng loại tài sản
- [x] Tạo issue triển khai nguồn tin tức Việt Nam và liên kết bài viết gốc
- [x] Tạo issue kiểm thử độ đầy đủ, timestamp, rate limit và fallback của nguồn dữ liệu Việt Nam

- [x] Thiết kế bảng asset watchlist, price snapshots, sync runs và email delivery
- [ ] Tạo provider backend cho cổ phiếu Việt Nam, NAV quỹ Việt Nam và vàng trong nước — đã có skeleton, còn cần xác minh parser thực tế từng nguồn
- [ ] Tạo sync pipeline idempotent theo taskUid/run key và lưu trạng thái lỗi — đã có claim runKey và email dedupe, còn cần test retry/concurrency
- [ ] Tạo scheduled endpoint /api/scheduled/sync-market chạy mỗi 2 giờ theo UTC — endpoint đã có, Heartbeat chưa được activate vì cần deploy trước
- [ ] Tạo email digest HTML và gửi qua Resend khi có RESEND_API_KEY/ALERT_EMAIL — code đã có, cần secrets và test delivery
- [ ] Bổ sung test cho provider, idempotency, scheduled handler và email fallback — hiện mới có parser/provider test
