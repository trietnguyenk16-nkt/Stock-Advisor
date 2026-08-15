# Deploy Stock Advisor lên Vercel + Supabase

## Cảnh báo trước khi deploy

Checkpoint mới nhất `8d90fda1` đã có migration SQL additive-only trong schema `stock_advisor`, nhưng runtime hiện tại của project vẫn được scaffold bằng Drizzle/MySQL. Vì vậy, **không đổi `DATABASE_URL` sang Supabase PostgreSQL ngay nếu chưa chuyển runtime sang PostgreSQL**. Việc chạy SQL tạo bảng thành công không tự làm `mysql2`/`mysql-core` đọc được các bảng trong schema `stock_advisor`.

Bạn có hai lựa chọn:

| Lựa chọn | Khi dùng | Ghi chú |
|---|---|---|
| Deploy Vercel với database hiện tại | Muốn đưa bản mới lên production ngay | Giữ `DATABASE_URL` hiện tại; Push/cron vẫn cần cấu hình secrets. |
| Deploy Vercel + Supabase | Muốn dùng database chung Supabase | Chạy migration additive-only, sau đó chuyển Drizzle sang `pg-core` và trỏ table vào `stock_advisor` trước khi đổi Production `DATABASE_URL`. |

Các bước dưới đây là quy trình an toàn cho lựa chọn thứ hai.

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

Mở file `supabase/migrations/20260815_stock_advisor_additive.sql` từ branch `main` và chạy trong **Supabase SQL Editor** của đúng project dùng chung. File chỉ tạo schema `stock_advisor`, các table và index mới. Nó không dùng `DROP`, `ALTER`, `TRUNCATE`, `UPDATE` hoặc `DELETE` trên object hiện hữu.

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

Kết quả cần có `tracked_assets`, `sync_runs`, `price_snapshots`, `news_items`, `asset_analyses`, `email_deliveries` và `push_subscriptions`. Đối chiếu thêm các bảng `public` của project cũ để bảo đảm chúng vẫn tồn tại.

## 4. Chuyển runtime sang PostgreSQL trước Production

Đây là bước kỹ thuật bắt buộc nếu muốn app đọc schema `stock_advisor`. Trong code, thay Drizzle `mysql-core` bằng `drizzle-orm/pg-core`, thay driver `mysql2` bằng driver PostgreSQL phù hợp, đổi enum/identity/boolean theo PostgreSQL và khai báo các bảng dưới schema `stock_advisor`.

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

Chỉ đổi Production `DATABASE_URL` sau khi dashboard, manual sync, history và cron đã đọc/ghi thành công qua PostgreSQL.

## 5. Thêm Environment Variables trên Vercel

Vào **Project → Settings → Environment Variables** và thêm cho **Production**. Có thể thêm Preview với database/test secrets riêng.

| Variable | Giá trị |
|---|---|
| `DATABASE_URL` | Supabase pooler URL, thường port `6543`, có `sslmode=require`; chỉ dùng sau khi runtime đã chuyển sang PostgreSQL |
| `CRON_SECRET` | Chuỗi ngẫu nhiên dài, dùng để bảo vệ `/api/cron/sync-market` |
| `RESEND_API_KEY` | Resend API key để gửi email |
| `ALERT_EMAIL` | Địa chỉ email nhận digest |
| `VAPID_PUBLIC_KEY` | Public VAPID key |
| `VAPID_PRIVATE_KEY` | Private VAPID key, chỉ server-side |
| `VAPID_SUBJECT` | Ví dụ `mailto:you@example.com` |
| `JWT_SECRET` | Secret runtime hiện tại nếu scaffold còn cần |
| `BUILT_IN_FORGE_API_URL` | Endpoint AI/runtime hiện tại |
| `BUILT_IN_FORGE_API_KEY` | API key server-side hiện tại |

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

Trước hết push code lên `main` và tạo Vercel Preview. Tiếp theo chạy migration trên Supabase, kiểm tra object và backup. Sau đó deploy runtime PostgreSQL ở Preview, chạy manual sync và mở `/history`. Khi mọi thứ ổn định, thêm Production Environment Variables, redeploy Production và kiểm tra Cron Jobs.

Nếu chưa hoàn tất chuyển Drizzle sang PostgreSQL, hãy giữ `DATABASE_URL` hiện tại và chỉ deploy các thay đổi frontend/backend không phụ thuộc Supabase. Đừng trỏ MySQL driver vào Supabase vì sẽ gây lỗi kết nối hoặc lỗi schema trong production.

## 8. Checklist production

| Kiểm tra | Kết quả mong muốn |
|---|---|
| Homepage | Dashboard tải được, không blank screen |
| Add/remove asset | Watchlist thay đổi đúng |
| Đồng bộ thủ công | Nút trả trạng thái running/success/partial/failed |
| `/history` | Hiển thị sync runs và email delivery gần nhất |
| Email | Resend nhận được digest hoặc delivery ghi rõ skipped/failed |
| Push | Browser xin quyền; sau khi bật có subscription; nút tắt hủy subscription |
| Cron | Vercel hiển thị lịch `0 11 * * *` |
| Database | Chỉ có object mới dưới `stock_advisor`; public tables không bị sửa |
| Secrets | Không xuất hiện trong client bundle hoặc GitHub |

## Tài liệu tham khảo

[1]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase database connections"

[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"

[3]: https://vercel.com/docs/cron-jobs/usage-and-pricing "Vercel Cron Jobs usage and pricing"
