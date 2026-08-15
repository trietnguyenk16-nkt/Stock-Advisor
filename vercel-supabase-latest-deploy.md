# Deploy Stock Advisor lên Vercel + Supabase

## Cảnh báo trước khi deploy

Runtime hiện tại đã được chuyển hoàn toàn sang Drizzle PostgreSQL (`pg-core`) và driver `pg`, với toàn bộ bảng Stock Advisor nằm trong schema riêng `stock_advisor`. Migration additive-only cũng tạo `stock_advisor.users` để tương thích với lớp OAuth của template; không có thao tác `DROP`, `ALTER`, `TRUNCATE`, `UPDATE` hoặc `DELETE` trên bảng dự án khác.

Ứng dụng ưu tiên `SUPABASE_DATABASE_URL`; biến `DATABASE_URL` chỉ là fallback tương thích với môi trường WebDev cũ. Trên Vercel, hãy khai báo `SUPABASE_DATABASE_URL` cho Production và Preview cùng connection string Supabase pooler port `6543`, kèm `sslmode=require`.

## 1. Kết nối GitHub với Vercel

Vào [Vercel Dashboard](https://vercel.com/dashboard), chọn **Add New → Project**, import repository `trietnguyenk16-nkt/Stock-Advisor` và chọn branch `main`. Vercel sẽ đọc `package.json`; không cần Dockerfile.

Thiết lập:

| Setting | Giá trị |
|---|---|
| Framework Preset | Vite hoặc Other, tùy màn hình Vercel nhận diện |
| Build Command | `pnpm build` |
| Install Command | `pnpm install --frozen-lockfile` |
| Output Directory | Để mặc định nếu build hiện tại đã được nhận diện |
| Node.js Version | 22.x nếu Vercel cho phép chọn |

Nếu project đã tồn tại trên Vercel, kiểm tra **Settings → Git** để chắc chắn Production Branch là `main`. Mỗi lần push lên `main`, Vercel sẽ tạo deployment production theo cấu hình project.

## 2. Backup database dùng chung

Trước migration, tạo backup từ Supabase Dashboard hoặc `pg_dump`. Không chạy migration trên database đích nếu chưa xác định đúng project-ref và chưa có bản backup kiểm tra được.

```bash
export SUPABASE_DB_URL='postgresql://postgres.<project-ref>:<PASSWORD>@aws-<region>.pooler.supabase.com:5432/postgres?sslmode=require'
pg_dump --format=custom --no-owner --no-privileges "$SUPABASE_DB_URL" > supabase-before-stock-advisor-$(date +%Y%m%d-%H%M%S).dump
pg_restore --list supabase-before-stock-advisor-YYYYMMDD-HHMMSS.dump > backup-contents.txt
```

Không commit file dump hoặc connection string vào GitHub. Nếu có thể, restore thử vào database/project tạm thời trước khi thay đổi production.

## 3. Chạy migration additive-only

Mở file `supabase/migrations/20260815_stock_advisor_additive.sql` từ branch `main` và chạy trong **Supabase SQL Editor** của đúng project dùng chung. File chỉ tạo schema `stock_advisor`, các table và index mới, bao gồm `users`. Nó không dùng `DROP`, `ALTER`, `TRUNCATE`, `UPDATE` hoặc `DELETE` trên object hiện hữu.

Sau khi chạy, kiểm tra:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'stock_advisor'
order by table_name;

select schemaname, indexname, tablename
from pg_indexes
where schemaname = 'stock_advisor'
order by tablename, indexname;
```

Kết quả cần có `users`, `tracked_assets`, `sync_runs`, `price_snapshots`, `news_items`, `asset_analyses`, `email_deliveries` và `push_subscriptions`. Đối chiếu thêm các bảng `public` của project cũ để bảo đảm chúng vẫn tồn tại.

## 4. Chuyển runtime sang PostgreSQL trước Production

Bước này đã hoàn tất trong source hiện tại: Drizzle dùng `drizzle-orm/pg-core`, runtime dùng `pg`, các identity/boolean/timestamp dùng kiểu PostgreSQL và mọi bảng đều khai báo dưới `stock_advisor`. Không còn import `mysql2` hoặc `mysql-core` trong source runtime.

Không thực hiện chuyển đổi bằng cách sửa trực tiếp các bảng project khác. Tạo một branch Preview hoặc database Supabase project tạm thời để kiểm tra:

```text
schema/table runtime -> stock_advisor.tracked_assets
schema/table runtime -> stock_advisor.price_snapshots
schema/table runtime -> stock_advisor.news_items
schema/table runtime -> stock_advisor.asset_analyses
schema/table runtime -> stock_advisor.sync_runs
schema/table runtime -> stock_advisor.email_deliveries
schema/table runtime -> stock_advisor.push_subscriptions
```

Sau khi dashboard, manual sync, history và cron đã đọc/ghi thành công qua PostgreSQL, redeploy Vercel với `SUPABASE_DATABASE_URL`. Do `DATABASE_URL` là built-in secret của template, không cần sửa nó; runtime đã ưu tiên biến Supabase riêng.

## 5. Thêm Environment Variables trên Vercel

Vào **Project → Settings → Environment Variables** và thêm cho **Production**. Có thể thêm Preview với database/test secrets riêng.

| Variable | Giá trị |
|---|---|
| `SUPABASE_DATABASE_URL` | Supabase pooler URL, port `6543`, có `sslmode=require`; biến database chính của runtime PostgreSQL |
| `CRON_SECRET` | Chuỗi ngẫu nhiên dài, dùng để bảo vệ `/api/cron/sync-market` |
| `RESEND_API_KEY` | Resend API key để gửi email |
| `OPENAI_API_KEY` | OpenAI API key dùng server-side cho phân tích AI; không đặt trong `VITE_*` |
| `ALERT_EMAIL` | Địa chỉ email nhận digest |
| `VAPID_PUBLIC_KEY` | Public VAPID key |
| `VAPID_PRIVATE_KEY` | Private VAPID key, chỉ server-side |
| `VAPID_SUBJECT` | Ví dụ `mailto:you@example.com` |
| `JWT_SECRET` | Secret runtime hiện tại nếu scaffold còn cần |
| `BUILT_IN_FORGE_API_URL` | Endpoint AI/runtime hiện tại |
| `BUILT_IN_FORGE_API_KEY` | API key server-side hiện tại nếu vẫn dùng các tính năng Manus khác |

Không đặt `VAPID_PRIVATE_KEY`, database password hoặc service-role key trong `VITE_*`, source code, `vercel.json`, GitHub hoặc localStorage.

## 6. Kiểm tra Vercel Cron

File `vercel.json` hiện có:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-market",
      "schedule": "0 11 * * *"
    }
  ]
}
```

`0 11 * * *` là **11:00 UTC**, tương đương **18:00 giờ Việt Nam**. Vercel sẽ gọi route với header `Authorization: Bearer <CRON_SECRET>`. Handler fail-closed nếu `CRON_SECRET` chưa được cấu hình.

Sau production deployment, mở **Vercel → Project → Cron Jobs** để kiểm tra cron đã được nhận diện. Không test bằng cách gọi route không có header secret; kết quả đúng phải là `401` hoặc `503`. Với test thủ công có secret:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/sync-market
```

## 7. Thứ tự deploy an toàn

Trước hết push code PostgreSQL lên `main` và tạo Vercel Preview. Tiếp theo backup và chạy migration trên Supabase, kiểm tra object. Sau đó khai báo `SUPABASE_DATABASE_URL` ở Preview, chạy manual sync và mở `/history`. Khi mọi thứ ổn định, thêm cùng biến vào Production, redeploy và kiểm tra Cron Jobs.

Không dùng `DATABASE_URL` của MySQL/TiDB cho bản PostgreSQL này. Nếu Preview chưa có `SUPABASE_DATABASE_URL`, app sẽ không kết nối database và các thao tác dữ liệu sẽ trả trạng thái rỗng/lỗi; hãy cấu hình secret trước khi kiểm thử production.

## 8. Checklist production

| Kiểm tra | Kết quả mong muốn |
|---|---|
| Homepage | Dashboard tải được, không blank screen |
| Add/remove asset | Watchlist thay đổi đúng |
| Đồng bộ thủ công | Nút trả trạng thái running/success/partial/failed |
| `/history` | Hiển thị sync runs và email delivery gần nhất |
| Email | Resend nhận được digest hoặc delivery ghi rõ skipped/failed |
| AI model | Dashboard cho phép chọn `gpt-4o-mini` hoặc `gpt-5-mini`; lựa chọn lưu trong `stock_advisor.ai_settings` |
| Push | Browser xin quyền; sau khi bật có subscription; nút tắt hủy subscription |
| Cron | Vercel hiển thị lịch `0 11 * * *` |
| Database | Chỉ có object mới dưới `stock_advisor`; public tables không bị sửa |
| Secrets | Không xuất hiện trong client bundle hoặc GitHub |

## Tài liệu tham khảo

[1]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase database connections"

[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"

[3]: https://vercel.com/docs/cron-jobs/usage-and-pricing "Vercel Cron Jobs usage and pricing"
