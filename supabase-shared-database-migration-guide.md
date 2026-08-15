# Stock Advisor trên Supabase database dùng chung

## Nguyên tắc an toàn

Migration này tạo một schema riêng có tên `stock_advisor`. Nó không sử dụng các bảng trong `public`, tạo `stock_advisor.users` và `stock_advisor.ai_settings` cho runtime riêng, không `ALTER` bảng hiện hữu và không xóa hoặc cập nhật dữ liệu của project khác. Toàn bộ bảng và index của Stock Advisor được đặt trong namespace riêng để giảm rủi ro collision.

> Không chạy migration này bằng `webdev_execute_sql` trên database của project hiện tại nếu `DATABASE_URL` chưa trỏ tới Supabase đích. Hãy chạy trong Supabase SQL Editor hoặc bằng Supabase CLI đã link đúng project.

## Các object sẽ được tạo

| Object | Vai trò |
|---|---|
| `stock_advisor.users` | User/owner runtime của template |
| `stock_advisor.ai_settings` | Model AI được chọn theo workspace |
| `stock_advisor.tracked_assets` | Watchlist tài sản Việt Nam |
| `stock_advisor.sync_runs` | Trạng thái từng lần đồng bộ |
| `stock_advisor.price_snapshots` | Snapshot giá/NAV và timestamp |
| `stock_advisor.news_items` | Tin tức và fingerprint chống trùng |
| `stock_advisor.asset_analyses` | Phân tích AI theo run |
| `stock_advisor.email_deliveries` | Trạng thái gửi email |
| `stock_advisor.push_subscriptions` | Web Push subscriptions |

## Backup trước khi chạy

Vì database có table của project khác, hãy tạo backup trước khi chạy migration dù migration này chỉ tạo schema riêng. Trong Supabase Dashboard, vào **Project Settings → Database → Backups** và tạo/kiểm tra backup gần nhất theo khả năng của gói đang dùng. Nếu cần bản backup cầm tay để kiểm tra restore, dùng `pg_dump` từ máy có thể kết nối tới Supabase:

```bash
export SUPABASE_DB_URL='postgresql://postgres.<project-ref>:<PASSWORD>@aws-<region>.pooler.supabase.com:5432/postgres?sslmode=require'
pg_dump --format=custom --no-owner --no-privileges "$SUPABASE_DB_URL" > supabase-shared-before-stock-advisor-$(date +%Y%m%d-%H%M%S).dump
```

Không ghi connection string chứa password vào shell history hoặc GitHub. Sau khi dump, kiểm tra file tồn tại và có kích thước hợp lý:

```bash
ls -lh supabase-shared-before-stock-advisor-*.dump
pg_restore --list supabase-shared-before-stock-advisor-YYYYMMDD-HHMMSS.dump > backup-contents.txt
```

Bản dump phải có danh sách object và không bị lỗi đọc. Để xác minh restore mà không chạm database production, tạo một database/project Supabase tạm thời hoặc database PostgreSQL local rồi chạy:

```bash
createdb stock_advisor_restore_check
pg_restore --clean --if-exists --no-owner --dbname=stock_advisor_restore_check supabase-shared-before-stock-advisor-YYYYMMDD-HHMMSS.dump
psql stock_advisor_restore_check -c "select count(*) from information_schema.tables where table_schema = 'public';"
```

Nếu migration gây sự cố sau khi chạy, ưu tiên rollback code/config về database URL cũ. Không chạy rollback schema trừ khi chắc chắn schema `stock_advisor` chỉ chứa object của ứng dụng này. Khôi phục toàn bộ database từ dump chỉ thực hiện trên bản sao hoặc theo quy trình restore của Supabase, vì restore trực tiếp có thể ghi đè dữ liệu của project khác.

## Kiểm tra trước khi chạy

Mở file migration và xác nhận file chỉ chứa `CREATE SCHEMA`, `CREATE TABLE`, `CREATE INDEX` và truy vấn verification. Không bỏ comment rollback trong file migration chính. Có thể chạy truy vấn này trước để xác nhận schema chưa tồn tại:

```sql
select schema_name
from information_schema.schemata
where schema_name = 'stock_advisor';
```

Nếu không có dòng kết quả, migration sẽ tạo namespace mới. Nếu đã có schema, dừng lại và kiểm tra các bảng trong schema trước khi chạy; `CREATE TABLE IF NOT EXISTS` không sửa cấu trúc bảng đã có.

## Chạy bằng Supabase SQL Editor

1. Mở đúng Supabase project đang chứa các bảng của project khác.
2. Chọn **SQL Editor → New query**.
3. Dán toàn bộ file `supabase/migrations/20260815_stock_advisor_additive.sql`.
4. Review phần đầu file để chắc chắn không có `DROP`, `ALTER`, `TRUNCATE`, `UPDATE` hoặc `DELETE`.
5. Chạy query trong một lần.
6. Kiểm tra kết quả verification cuối file và xác nhận chỉ có các bảng dưới schema `stock_advisor`.

## Chạy bằng Supabase CLI

Nếu project đã được link đúng:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Chỉ đặt migration additive-only này trong thư mục migration của project database dùng chung. Supabase khuyến nghị quản lý thay đổi schema bằng migration files và không chỉnh schema remote trực tiếp sau khi đã bắt đầu migration workflow [1].

## Kiểm tra sau khi chạy

Chạy các query chỉ đọc sau đây:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'stock_advisor'
order by table_name;

select schemaname, indexname, tablename
from pg_indexes
where schemaname = 'stock_advisor'
order by tablename, indexname;

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Query cuối chỉ nhằm đối chiếu rằng các bảng `public` của project khác vẫn hiện diện. Không dùng `DROP SCHEMA ... CASCADE` để “dọn dẹp” nếu chưa xác nhận dữ liệu.

## Rollback

Rollback không được chạy tự động. File `20260815_stock_advisor_rollback_manual.sql` chỉ chứa các lệnh rollback đã comment. Chỉ bỏ comment sau khi kiểm tra rằng schema `stock_advisor` không chứa dữ liệu cần giữ. Các lệnh rollback chỉ xóa schema riêng, không chạm vào `public` hoặc schema khác.

## Cấu hình ứng dụng sau migration

Runtime hiện tại đã dùng Drizzle `pg-core`/`pg`, trỏ các bảng vào schema `stock_advisor`, và dùng `ai_settings` để lưu model `gpt-4o-mini` hoặc `gpt-5-mini`. Database URL cho Vercel dùng biến `SUPABASE_DATABASE_URL`, transaction pooler port `6543` với SSL, theo hướng dẫn kết nối Supabase [2].

Không đưa database password, Supabase service-role key, `OPENAI_API_KEY` hoặc VAPID private key vào frontend/GitHub. Thêm `SUPABASE_DATABASE_URL` và `OPENAI_API_KEY` trong Vercel Environment Variables cho Production/Preview phù hợp.

## Tài liệu tham khảo

[1]: https://supabase.com/docs/guides/deployment/database-migrations "Supabase Database Migrations"

[2]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase Connect to your database"
