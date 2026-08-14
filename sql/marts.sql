-- Recommended mart tables for Analytics Board (per tenant dataset).
-- Run these as BigQuery scheduled queries (daily) after GA4 export is linked.
-- Replace PROJECT and DATASET with the values from tenants/<slug>/tenant.json
--   e.g. acme-ga4.analytics_123456789
-- Each client must have its own dataset (data isolation).

-- 1) Daily overview KPIs
CREATE OR REPLACE TABLE `PROJECT.DATASET.mart_daily_overview` AS
SELECT
  PARSE_DATE('%Y%m%d', event_date) AS date,
  COUNT(DISTINCT CONCAT(
    user_pseudo_id,
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
  )) AS sessions,
  COUNT(DISTINCT user_pseudo_id) AS users,
  COUNTIF(event_name = 'page_view') AS pageviews,
  COUNTIF(event_name IN ('purchase', 'generate_lead')) AS conversions
FROM `PROJECT.DATASET.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY date;

-- For backfill, run a similar query without the single-day suffix filter, partitioned by date.
-- Prefer MERGE / INSERT for incremental schedules in production.

-- 2) Daily by source / medium
CREATE OR REPLACE TABLE `PROJECT.DATASET.mart_daily_by_source` AS
SELECT
  PARSE_DATE('%Y%m%d', event_date) AS date,
  IFNULL(traffic_source.source, '(direct)') AS source,
  IFNULL(traffic_source.medium, '(none)') AS medium,
  COUNT(DISTINCT CONCAT(
    user_pseudo_id,
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
  )) AS sessions
FROM `PROJECT.DATASET.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  AND event_name = 'session_start'
GROUP BY date, source, medium;

-- 3) Daily by page
CREATE OR REPLACE TABLE `PROJECT.DATASET.mart_daily_by_page` AS
SELECT
  PARSE_DATE('%Y%m%d', event_date) AS date,
  IFNULL((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'), '(not set)') AS page_path,
  IFNULL((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title'), '(not set)') AS page_title,
  COUNT(*) AS pageviews
FROM `PROJECT.DATASET.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  AND event_name = 'page_view'
GROUP BY date, page_path, page_title;
