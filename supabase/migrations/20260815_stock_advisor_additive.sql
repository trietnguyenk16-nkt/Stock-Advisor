-- Stock Advisor additive-only migration
-- Safety contract:
--   * Creates only the dedicated `stock_advisor` schema and its objects.
--   * Does not ALTER, DROP, TRUNCATE, UPDATE, or DELETE any existing object.
--   * Safe to run on a Supabase database shared with another project.

create schema if not exists stock_advisor;

create table if not exists stock_advisor.tracked_assets (
  id bigint generated always as identity primary key,
  workspace_key varchar(96) not null default 'owner',
  ticker varchar(32) not null,
  display_name varchar(255) not null,
  asset_type varchar(16) not null check (asset_type in ('equity', 'fund', 'gold')),
  exchange varchar(16),
  provider_code varchar(64) not null,
  currency varchar(8) not null default 'VND',
  unit varchar(32) not null default 'share',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_assets_workspace_ticker_unique unique (workspace_key, ticker)
);

create table if not exists stock_advisor.sync_runs (
  id bigint generated always as identity primary key,
  run_key varchar(96) not null unique,
  status varchar(16) not null check (status in ('running', 'success', 'partial', 'failed')),
  started_at bigint not null,
  finished_at bigint,
  assets_processed integer not null default 0,
  assets_succeeded integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists stock_advisor.price_snapshots (
  id bigint generated always as identity primary key,
  asset_id bigint not null references stock_advisor.tracked_assets(id) on delete cascade,
  run_key varchar(96) not null,
  price numeric(20, 6),
  bid numeric(20, 6),
  ask numeric(20, 6),
  change_percent numeric(12, 6),
  as_of bigint not null,
  source_name varchar(128) not null,
  source_url varchar(1024),
  freshness varchar(32) not null default 'unknown',
  warning text,
  created_at timestamptz not null default now(),
  constraint price_snapshots_run_asset_unique unique (run_key, asset_id)
);

create table if not exists stock_advisor.news_items (
  id bigint generated always as identity primary key,
  asset_id bigint not null references stock_advisor.tracked_assets(id) on delete cascade,
  fingerprint varchar(128) not null,
  title varchar(512) not null,
  source_name varchar(128) not null,
  source_url varchar(1024) not null,
  snippet text,
  published_at bigint,
  fetched_at bigint not null,
  created_at timestamptz not null default now(),
  constraint news_items_asset_fingerprint_unique unique (asset_id, fingerprint)
);

create table if not exists stock_advisor.asset_analyses (
  id bigint generated always as identity primary key,
  asset_id bigint not null references stock_advisor.tracked_assets(id) on delete cascade,
  run_key varchar(96) not null,
  signal varchar(8) not null check (signal in ('BUY', 'SELL', 'HOLD')),
  summary text not null,
  reference_price numeric(20, 6),
  target_price numeric(20, 6),
  risk text not null,
  confidence numeric(6, 4),
  as_of bigint not null,
  created_at timestamptz not null default now(),
  constraint asset_analyses_run_asset_unique unique (run_key, asset_id)
);

create table if not exists stock_advisor.email_deliveries (
  id bigint generated always as identity primary key,
  run_key varchar(96) not null unique,
  recipient varchar(320) not null,
  status varchar(16) not null check (status in ('sent', 'skipped', 'failed')),
  provider_message_id varchar(255),
  error_message text,
  sent_at bigint,
  created_at timestamptz not null default now()
);

create table if not exists stock_advisor.users (
  id bigint generated always as identity primary key,
  open_id varchar(64) not null unique,
  name text,
  email varchar(320),
  login_method varchar(64),
  role varchar(16) not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_signed_in timestamptz not null default now()
);

create table if not exists stock_advisor.push_subscriptions (
  id bigint generated always as identity primary key,
  workspace_key varchar(96) not null default 'owner',
  endpoint varchar(2048) not null,
  p256dh text not null,
  auth text not null,
  user_agent varchar(512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_workspace_endpoint_unique unique (workspace_key, endpoint)
);

create index if not exists tracked_assets_workspace_active_idx on stock_advisor.tracked_assets (workspace_key, is_active);
create index if not exists price_snapshots_asset_asof_idx on stock_advisor.price_snapshots (asset_id, as_of);
create index if not exists news_items_asset_published_idx on stock_advisor.news_items (asset_id, published_at);
create index if not exists sync_runs_started_idx on stock_advisor.sync_runs (started_at desc);
create index if not exists email_deliveries_created_idx on stock_advisor.email_deliveries (created_at desc);

-- Verification query; this returns only objects created in the dedicated schema.
select table_schema, table_name
from information_schema.tables
where table_schema = 'stock_advisor'
order by table_name;
