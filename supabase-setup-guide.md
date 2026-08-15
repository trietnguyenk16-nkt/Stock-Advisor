# Hướng dẫn dùng Supabase cho Stock Advisor

## Kiến trúc khuyến nghị

Stock Advisor có thể dùng Vercel cho frontend, API và Vercel Cron; Supabase chỉ cung cấp PostgreSQL. Không cần bật Supabase Auth vì ứng dụng chỉ có một người dùng và backend hiện tại đã xử lý access ở phía server. Không đưa Supabase key hoặc database password vào browser.

> Lưu ý quan trọng: project hiện tại đang dùng Drizzle với `mysql-core`. Supabase dùng PostgreSQL, vì vậy migration đúng phải chuyển schema sang `pg-core`, điều chỉnh kiểu dữ liệu và chạy migration mới. Chỉ thay `DATABASE_URL` là chưa đủ.

## Bước 1: Tạo project Supabase

Mở [Supabase Dashboard](https://supabase.com/dashboard), chọn **New project**, đặt tên như `stock-advisor`, chọn region gần Việt Nam nhất đang có sẵn, tạo database password mạnh và lưu password trong password manager. Không cần bật Authentication cho phiên bản single-owner.

Sau khi project được tạo, vào nút **Connect** trên Dashboard. Với Vercel Functions, ưu tiên **Shared Pooler transaction mode** và port `6543`; đây là chế độ dành cho các kết nối ngắn của serverless functions. Với migration hoặc `pg_dump`, dùng direct connection nếu môi trường hỗ trợ IPv6, hoặc session pooler nếu cần IPv4. Supabase mô tả các chế độ kết nối trong [tài liệu connection](https://supabase.com/docs/guides/database/connecting-to-postgres) [1].

## Bước 2: Chuẩn bị DATABASE_URL

Trong Vercel, đặt `DATABASE_URL` bằng connection string transaction pooler do nút **Connect** cung cấp, ví dụ:

```text
postgresql://postgres.<project-ref>:<PASSWORD>@aws-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

Không tự đoán host, username hoặc region; hãy copy đúng chuỗi từ Dashboard. Nếu driver hoặc ORM dùng prepared statements, tắt prepared statements khi dùng transaction pooler vì Supabase ghi rõ transaction mode không hỗ trợ chúng [1].

## Bước 3: Chuyển Drizzle từ MySQL sang PostgreSQL

Các thay đổi chính trong code là thay import:

```ts
// hiện tại
import { mysqlTable, int, varchar, text, timestamp } from "drizzle-orm/mysql-core";

// sau migration
import { pgTable, serial, integer, varchar, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
```

Các mapping quan trọng là `int` sang `integer` hoặc `serial`, `mysqlEnum` sang `pgEnum` hoặc `varchar` có validation ở Zod, `timestamp` sang `timestamp({ withTimezone: true })` nếu lưu UTC, và các field cờ `0/1` sang `boolean`. Tên bảng và tên cột nên giữ ổn định để phần router không phải đổi quá nhiều.

Các bảng cần chuyển gồm `tracked_assets`, `price_snapshots`, `news_items`, `asset_analyses`, `sync_runs`, `email_deliveries` và `push_subscriptions`. Nên tạo migration PostgreSQL mới thay vì chỉnh sửa migration MySQL đã áp dụng ở database cũ.

## Bước 4: Quản lý migration bằng Supabase CLI

Cài CLI theo tài liệu chính thức, đăng nhập và liên kết project:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
```

Tạo migration:

```bash
supabase migration new stock_advisor_postgres_schema
```

Đặt SQL PostgreSQL vào file trong `supabase/migrations/`, kiểm tra ở local/staging, rồi đẩy lên project:

```bash
supabase db push
```

Supabase khuyến nghị quản lý schema bằng migration files và không chỉnh trực tiếp remote database sau khi đã bắt đầu dùng migration workflow [2].

## Bước 5: Cấu hình Vercel Environment Variables

Trong **Vercel → Project → Settings → Environment Variables**, thêm các biến cho **Production** và, nếu cần, Preview:

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL có `sslmode=require` |
| `CRON_SECRET` | Bảo vệ endpoint Vercel Cron |
| `RESEND_API_KEY` | Gửi email digest |
| `ALERT_EMAIL` | Email nhận digest |
| `VAPID_PUBLIC_KEY` | Public key đăng ký PWA Push |
| `VAPID_PRIVATE_KEY` | Private key gửi Push, chỉ server-side |
| `VAPID_SUBJECT` | Subject VAPID, ví dụ `mailto:you@example.com` |
| `JWT_SECRET` | Secret runtime hiện có của scaffold nếu backend còn dùng |
| `BUILT_IN_FORGE_API_URL` | Endpoint AI/runtime hiện có |
| `BUILT_IN_FORGE_API_KEY` | Secret AI/runtime hiện có |

Sau khi lưu biến môi trường, phải redeploy Vercel. Không commit file `.env`, không đưa `VAPID_PRIVATE_KEY`, database password hoặc service-role key vào frontend.

## Bước 6: RLS và single-owner app

Nếu chỉ backend Vercel kết nối Supabase bằng database connection string, browser không truy cập trực tiếp Supabase Data API. Khi đó vẫn nên bật RLS trên các bảng thuộc schema `public` để tránh mở nhầm quyền nếu sau này dùng Data API. Supabase yêu cầu các bảng trong exposed schema phải bật RLS và cần policy phù hợp nếu dùng publishable/anon key [3].

Vì app không dùng Supabase Auth, không nên tạo policy dựa trên `auth.uid()`. Có thể giữ toàn bộ thao tác qua Vercel server với database role server-side, đồng thời không expose `service_role` key cho client. Nếu sau này mở app cho nhiều người dùng, cần thêm Auth và cột `owner_id`/`user_id` trước khi mở Data API.

## Bước 7: Kiểm tra kết nối và deploy

Sau khi migration và variables hoàn tất:

```bash
pnpm check
pnpm test
pnpm build
```

Deploy lên Vercel, sau đó kiểm tra lần lượt dashboard, thêm/xóa ticker, manual sync, `/history`, email delivery và Vercel Cron. Cron hiện cấu hình mặc định lúc `11:00 UTC`, tương đương `18:00` giờ Việt Nam. Supabase transaction pooler phù hợp với Vercel Functions vì đây là các kết nối tạm thời; Vercel cũng khuyến nghị dùng connection pooling cho Functions [4].

## Không nên làm

Không dùng direct IPv6 connection trong Vercel nếu runtime không có IPv6; không dùng port `5432` transaction mode cho Functions; không để database password trong GitHub; không bật anon write policy cho tất cả bảng; không đổi schema trực tiếp trong Supabase Dashboard sau khi đã có migration files; và không chuyển dữ liệu production trước khi backup database MySQL/TiDB hiện tại.

## Thứ tự migration an toàn

Trước hết tạo Supabase project và kiểm tra connection string. Tiếp theo tạo schema PostgreSQL mới, chạy test trên database trống, sau đó export/transform dữ liệu cần giữ từ database cũ. Chỉ khi dashboard, manual sync, email và cron đã chạy ở Preview mới đổi `DATABASE_URL` Production. Giữ database cũ ở chế độ read-only trong thời gian quan sát để có thể đối chiếu và rollback cấu hình.

## Tài liệu tham khảo

[1]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase: Connect to your database"

[2]: https://supabase.com/docs/guides/deployment/database-migrations "Supabase: Database Migrations"

[3]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase: Row Level Security"

[4]: https://vercel.com/kb/guide/connection-pooling-with-functions "Vercel: Connection Pooling with Functions"
