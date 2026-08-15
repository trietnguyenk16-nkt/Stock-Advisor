# Deploy Stock Advisor lên hạ tầng miễn phí với scheduler 2 giờ/lần

## Kết luận ngắn

Đối với ứng dụng hiện tại, **Oracle Cloud Always Free VM là lựa chọn phù hợp hơn Render Free**. Oracle cung cấp VM chạy liên tục, nên có thể dùng `systemd` hoặc cron của Linux để gọi pipeline mỗi hai giờ. Oracle công bố các tài nguyên Always Free có thời hạn không giới hạn, nhưng vẫn có giới hạn capacity, vùng triển khai và chính sách thu hồi máy nhàn rỗi [1] [2].

Render Free phù hợp để preview hoặc chạy thử frontend/backend, nhưng web service sẽ sleep sau 15 phút không có traffic, filesystem là ephemeral, Postgres Free hết hạn sau 30 ngày, và Render không khuyến nghị Free cho production [3]. Render Cron Job không nằm trong free instance; cron job được tính theo thời gian chạy và có mức tối thiểu 1 USD/tháng cho mỗi cron service [4].

> **Khuyến nghị:** Dùng Oracle Cloud VM làm máy chạy app và scheduler. Không dùng Docker nếu muốn triển khai đơn giản; cài Node.js, pnpm, Nginx và systemd trực tiếp trên Ubuntu.

## Kiến trúc đề xuất

| Thành phần | Oracle Cloud VM | Render Free |
| --- | --- | --- |
| Frontend + Express/tRPC | Chạy bằng Node.js/systemd | Chạy được nhưng sleep khi idle |
| Scheduler 2 giờ | `systemd timer` hoặc cron Linux | Cần Render Cron Job trả phí tối thiểu 1 USD/tháng |
| Database | MySQL native trên VM hoặc database managed bên ngoài | Render Postgres Free không tương thích trực tiếp với schema Drizzle/MySQL hiện tại và chỉ tồn tại 30 ngày |
| Email | Resend API qua HTTPS, không dùng SMTP port 25 | Resend API qua HTTPS; Render Free chặn các cổng SMTP phổ biến |
| TLS/domain | Nginx + Let’s Encrypt hoặc reverse proxy | Managed TLS/custom domain có sẵn |
| Độ phù hợp | Tốt nhất cho scheduler chạy liên tục | Tốt cho preview, không phù hợp mục tiêu production miễn phí |

## Lưu ý quan trọng trước khi rời Manus

Project hiện tại được scaffold cho Manus WebDev và đang dùng các biến môi trường/API tích hợp sẵn của Manus như `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` và các biến liên quan đến AI. Các biến này **không tự động xuất hiện trên Oracle hoặc Render**. Khi deploy bên ngoài, cần cung cấp API key tương ứng của dịch vụ bạn muốn dùng, chẳng hạn API của nhà cung cấp LLM, Resend và database.

Endpoint hiện tại `/api/scheduled/sync-market` xác thực bằng `sdk.authenticateRequest()` và `taskUid` của Manus Heartbeat. Khi chạy trên Oracle, Manus Heartbeat không gọi endpoint đó. Cần tạo một chế độ scheduler ngoài nền tảng, tốt nhất bằng một trong hai cách sau:

| Cách | Khuyến nghị | Mô tả |
| --- | ---: | --- |
| CLI sync trực tiếp | Cao | Tạo entrypoint production gọi `syncMarket(runKey)`; systemd timer chạy entrypoint này, không mở endpoint scheduler ra Internet. |
| HTTP endpoint có secret | Trung bình | Cho phép `Authorization: Bearer $SCHEDULER_SECRET`; chỉ systemd timer trên VM gọi `127.0.0.1:3000`. Không dùng endpoint không có xác thực. |

Không nên cố gọi endpoint Manus bằng cookie cron từ Oracle. Cookie đó thuộc lifecycle của Manus Heartbeat và không phải cơ chế xác thực portable.

## Phương án A — Oracle Cloud Always Free VM

### 1. Tạo tài khoản và VM

Truy cập [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) và tạo tài khoản. Oracle yêu cầu thông tin thẻ để xác minh danh tính; theo tài liệu Oracle, thẻ có thể nhận một authorization hold tạm thời nhưng Always Free resources không bị tính phí nếu nằm trong hạn mức [1]. Chọn **home region** ngay từ đầu vì một số Always Free resources chỉ cấp ở home region.

Tạo một VM Ubuntu 24.04 hoặc Ubuntu 22.04. Nếu có thể cấp phát, lựa chọn hợp lý là Ampere A1 với 1 OCPU và 6 GB RAM; nếu gặp “out of host capacity”, dùng AMD Micro. Oracle ghi nhận Ampere A1 Always Free tương đương tối đa 2 OCPU và 12 GB RAM, còn AMD có tối đa hai VM micro tùy cách phân bổ tài nguyên [2].

Gán public IPv4, tạo VCN/subnet public, mở inbound TCP 22, 80 và 443 ở Security List/NSG. Chỉ mở 3000 nội bộ, không mở public port 3000.

### 2. SSH và hardening cơ bản

Từ máy local:

```bash
chmod 600 ~/Downloads/oracle-stock-advisor.key
ssh -i ~/Downloads/oracle-stock-advisor.key ubuntu@YOUR_ORACLE_PUBLIC_IP
```

Trên VM:

```bash
sudo apt update && sudo apt -y upgrade
sudo apt install -y git curl build-essential nginx ufw ca-certificates
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Không mở port 3000 ra Internet. Nếu dùng Oracle security list, chỉ mở 22/80/443 ở lớp cloud firewall; UFW vẫn cần được bật trong VM.

### 3. Cài Node.js và pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
corepack prepare pnpm@10.4.1 --activate
node --version
pnpm --version
```

### 4. Clone repository và build

```bash
sudo mkdir -p /opt/stock-advisor
sudo chown -R "$USER":"$USER" /opt/stock-advisor
cd /opt/stock-advisor
git clone https://github.com/trietnguyenk16-nkt/Stock-Advisor.git .
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Nếu repository private, dùng SSH deploy key hoặc GitHub token có scope tối thiểu cần thiết; không đặt token trực tiếp trong file service.

### 5. Cấu hình secrets

Tạo file chỉ root đọc được:

```bash
sudo install -o root -g root -m 600 /dev/null /etc/stock-advisor.env
sudo nano /etc/stock-advisor.env
```

Mẫu tối thiểu:

```dotenv
NODE_ENV=production
DATABASE_URL=mysql://stock_advisor:CHANGE_ME@127.0.0.1:3306/stock_advisor
JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
RESEND_API_KEY=re_...
ALERT_EMAIL=your-email@example.com
SCHEDULER_SECRET=GENERATE_ANOTHER_LONG_RANDOM_SECRET
```

Không commit file này vào Git. Nếu tiếp tục dùng AI qua built-in Manus Forge, cần xác minh API đó có được phép gọi từ external VPS; nếu không, thay bằng provider LLM/API key riêng và cập nhật `server/_core/llm.ts` theo adapter tương ứng.

### 6. Database

Có hai lựa chọn. Lựa chọn an toàn hơn là tiếp tục dùng một MySQL managed có backup. Lựa chọn không phát sinh thêm dịch vụ là cài MySQL native trên VM:

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE stock_advisor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'stock_advisor'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME'; GRANT ALL PRIVILEGES ON stock_advisor.* TO 'stock_advisor'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

Sau đó cập nhật `DATABASE_URL` và chạy migration theo schema của project. Không mở MySQL port 3306 public. Cần thiết lập backup định kỳ sang Oracle Object Storage hoặc một nơi lưu trữ khác; không coi VM disk là backup.

### 7. Chạy app bằng systemd

Tạo service:

```bash
sudo nano /etc/systemd/system/stock-advisor.service
```

Nội dung:

```ini
[Unit]
Description=Stock Advisor web application
After=network-online.target mysql.service
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/stock-advisor
EnvironmentFile=/etc/stock-advisor.env
ExecStart=/usr/bin/node /opt/stock-advisor/dist/index.js
Restart=always
RestartSec=10
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Kích hoạt:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now stock-advisor
sudo systemctl status stock-advisor
journalctl -u stock-advisor -f
```

### 8. Nginx và HTTPS

Tạo virtual host:

```bash
sudo nano /etc/nginx/sites-available/stock-advisor
```

```nginx
server {
    listen 80;
    server_name your-domain.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/stock-advisor /etc/nginx/sites-enabled/stock-advisor
sudo nginx -t
sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
```

Nếu chưa có domain, có thể kiểm thử bằng IP nhưng nên dùng domain trước khi bật email/webhook production.

### 9. Scheduler 2 giờ bằng systemd timer

Vì project hiện tại đang gắn endpoint scheduler với Manus Heartbeat, trước tiên cần implement một CLI entrypoint hoặc một endpoint local dùng `SCHEDULER_SECRET`. Mô hình an toàn hơn là CLI. Ví dụ, sau khi project có script `dist/run-sync.js`:

```bash
sudo nano /etc/systemd/system/stock-advisor-sync.service
```

```ini
[Unit]
Description=Sync Vietnam market data and send digest
After=stock-advisor.service

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/opt/stock-advisor
EnvironmentFile=/etc/stock-advisor.env
ExecStart=/usr/bin/node /opt/stock-advisor/dist/run-sync.js
```

```bash
sudo nano /etc/systemd/system/stock-advisor-sync.timer
```

```ini
[Unit]
Description=Run Stock Advisor sync every two hours

[Timer]
OnCalendar=*-*-* 00/2:00:00 UTC
Persistent=true
RandomizedDelaySec=5m

[Install]
WantedBy=timers.target
```

Kích hoạt và kiểm thử:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now stock-advisor-sync.timer
sudo systemctl list-timers stock-advisor-sync.timer
sudo systemctl start stock-advisor-sync.service
journalctl -u stock-advisor-sync.service -n 100 --no-pager
```

`Persistent=true` giúp chạy bù một lần sau khi VM reboot hoặc offline tại thời điểm dự kiến. `RandomizedDelaySec` tránh việc mọi hệ thống đều gọi đúng một giây, nhưng vẫn nằm trong chu kỳ gần hai giờ.

## Phương án B — Render

Render cho phép deploy Free Web Service, nhưng tài liệu chính thức nêu rõ Free Web Service sleep sau 15 phút không có inbound traffic, filesystem mất khi restart/redeploy, và Free Postgres hết hạn sau 30 ngày [3]. Vì vậy, không nên đặt scheduler trong một process Node chạy nền trên Render Free.

Render Cron Job là mô hình đúng về kỹ thuật vì nó chạy command rồi thoát, nhưng Render nêu mức tối thiểu **1 USD/tháng cho mỗi cron job service**; thời gian chạy còn được tính theo giây [4]. Render Cron Job dùng cron expression 5 trường UTC, ví dụ lịch hai giờ có thể dùng:

```text
0 */2 * * *
```

Command cần là command kết thúc sau mỗi lần chạy, chẳng hạn:

```bash
pnpm sync:market
```

Render Cron không truy cập persistent disk. Nếu dùng Render, database nên là managed database có backup và pipeline cần hoàn toàn idempotent. Với project hiện tại, còn phải chuyển từ MySQL/TiDB sang PostgreSQL hoặc giữ MySQL bên ngoài và cập nhật connection/schema trước khi deploy.

## Cách kiểm tra sau deploy

| Kiểm tra | Lệnh/điểm kiểm tra |
| --- | --- |
| App sống | `curl -I https://your-domain.example.com/` |
| Health/runtime | `systemctl status stock-advisor`, `journalctl -u stock-advisor` |
| Scheduler | `systemctl list-timers`, log `stock-advisor-sync.service` |
| Database | `mysql -h 127.0.0.1 -u stock_advisor -p stock_advisor` |
| Email | kiểm tra `email_deliveries`, Resend dashboard và inbox |
| Dữ liệu cũ | mọi quote/NAV/gold snapshot phải có `sourceName`, `sourceUrl`, `asOf`, `freshness` |
| Bảo mật | không public 3000/3306; secrets chỉ ở `/etc/stock-advisor.env` |
| Backup | thử khôi phục một bản dump, không chỉ kiểm tra file backup tồn tại |

## Các rủi ro cần biết

Oracle Always Free không phải SLA production. Oracle ghi rõ capacity có thể không sẵn ở region đã chọn, tài khoản có thể bị kiểm tra và các instance nhàn rỗi có thể bị thu hồi nếu dưới ngưỡng sử dụng trong khoảng thời gian quy định [2]. Cần bật Monitoring, lưu backup ngoài VM và đặt cảnh báo quota.

Render Free cũng không nên xem là production; chính tài liệu Render khuyến cáo Free instance cho testing/hobby/preview, không phải production [3]. Nếu cần ít thao tác vận hành nhất, giữ Manus hosting; nếu mục tiêu chính là không trả phí cho lịch hai giờ và chấp nhận tự quản trị server, chọn Oracle VM.

## References

[1]: https://www.oracle.com/cloud/free/ "Oracle Cloud Free Tier"
[2]: https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm "Oracle Always Free Resources"
[3]: https://render.com/docs/free "Render Deploy for Free"
[4]: https://render.com/docs/cronjobs "Render Cron Jobs"


## CLI sync độc lập trên VPS

Project hiện có entrypoint `server/run-sync.ts`, được bundle thành `dist/run-sync.js` khi chạy `pnpm build`. Lệnh production là:

```bash
pnpm sync:market
```

CLI không gọi `/api/scheduled/sync-market`. Nó gọi trực tiếp `syncMarket(runKey)`, lấy danh sách `tracked_assets`, gọi provider Việt Nam, lưu snapshot/news/analysis và gửi Resend digest. Nếu chạy lại trong cùng cửa sổ hai giờ, CLI tạo cùng `runKey` dạng `vps:<bucket>` để cơ chế database idempotency bỏ qua lần chạy trùng. Có thể override khi chạy thủ công:

```bash
SYNC_RUN_KEY=manual:2026-08-15T10:00Z pnpm sync:market
```

Sau khi clone code mới trên VPS, chạy:

```bash
cd /opt/stock-advisor
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm sync:market
```

Nếu dùng systemd timer, service oneshot nên gọi CLI đã bundle để không cần `tsx` trong runtime:

```ini
[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/opt/stock-advisor
EnvironmentFile=/etc/stock-advisor.env
ExecStart=/usr/bin/node /opt/stock-advisor/dist/run-sync.js
```

Exit code bằng `0` khi run thành công, một phần hoặc bị bỏ qua do idempotency; exit code bằng `1` khi pipeline thất bại hoặc crash. Vì vậy systemd có thể ghi log và cảnh báo dựa trên trạng thái service mà không cần HTTP callback.


### Cấu hình task UID cho CLI

Nếu VM có nhiều scheduler hoặc muốn phân biệt lịch chạy, thêm vào `/etc/stock-advisor.env`:

```dotenv
SYNC_TASK_UID=oracle-vps-market-digest
```

CLI sẽ tạo runKey dạng `vps:oracle-vps-market-digest:<two-hour-bucket>`. Nếu chỉ có một scheduler, có thể bỏ biến này và CLI sẽ dùng `vps:<two-hour-bucket>`. `SYNC_RUN_KEY` vẫn được hỗ trợ để chạy thủ công một run cụ thể.

## Phương án C — Vercel Cron, mặc định 18:00 giờ Việt Nam

Nếu chọn Vercel, file cấu hình lịch duy nhất cần chỉnh là `vercel.json` ở thư mục gốc. Lịch hiện tại là:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{
    "path": "/api/cron/sync-market",
    "schedule": "0 11 * * *"
  }]
}
```

Vercel Cron dùng UTC. Vì Việt Nam là UTC+7, `0 11 * * *` nghĩa là **11:00 UTC mỗi ngày = 18:00 giờ Việt Nam mỗi ngày**. Nếu muốn đổi giờ, sửa `schedule` theo công thức `phút giờ_UTC * * *`; ví dụ 20:30 Việt Nam là `30 13 * * *`. File `server/cronConfig.ts` và `server/cronConfig.test.ts` giúp kiểm tra phép chuyển đổi này.

Route `/api/cron/sync-market` bắt buộc biến môi trường `CRON_SECRET` và nhận `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sẽ gọi route theo cấu hình; không dùng `setInterval`, `node-cron`, systemd timer hoặc endpoint Heartbeat Manus cho phương án này. Trên Vercel, cần cấu hình tối thiểu:

```dotenv
CRON_SECRET=chuoi_ngau_nhien_dai
DATABASE_URL=mysql://...
RESEND_API_KEY=re_...
ALERT_EMAIL=your-email@example.com
JWT_SECRET=chuoi_ngau_nhien_dai
```

Sau khi deploy, kiểm tra Cron trong Vercel Dashboard, xem Function Logs và gọi thủ công với secret:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://your-project.vercel.app/api/cron/sync-market
```

Lưu ý: Vercel Cron và Vercel Functions có giới hạn theo plan, thời gian chạy và mức sử dụng. Chức năng AI/provider/email cần hoàn tất bằng API key bên ngoài; các biến tích hợp nội bộ Manus không tự động có trên Vercel. Nếu cần lịch dày hơn hoặc thời gian chạy dài, phải kiểm tra plan Vercel hiện hành trước khi deploy.
