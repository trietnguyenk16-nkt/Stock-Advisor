-- MANUAL ROLLBACK ONLY
-- This removes only the dedicated Stock Advisor schema.
-- Review the verification query first and run only if the schema contains no data you need.
-- It does not touch public tables or any other schema.

-- begin;
-- drop table if exists stock_advisor.push_subscriptions;
-- drop table if exists stock_advisor.email_deliveries;
-- drop table if exists stock_advisor.asset_analyses;
-- drop table if exists stock_advisor.news_items;
-- drop table if exists stock_advisor.price_snapshots;
-- drop table if exists stock_advisor.sync_runs;
-- drop table if exists stock_advisor.tracked_assets;
-- drop schema if exists stock_advisor;
-- commit;

-- Review before uncommenting:
select table_schema, table_name
from information_schema.tables
where table_schema = 'stock_advisor'
order by table_name;
