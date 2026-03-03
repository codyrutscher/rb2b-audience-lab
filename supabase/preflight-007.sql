-- Pre-flight: run this in Supabase SQL Editor BEFORE applying 007_retarget_integration.sql.
-- Verifies rb2b prerequisites exist and rt_* tables do not yet exist (safe to migrate).

-- =============================================================================
-- 1) Prerequisites: rb2b tables required for migration 007
-- =============================================================================
WITH prerequisites AS (
  SELECT unnest(ARRAY['workspaces', 'user_workspaces']) AS table_name
),
prereq_check AS (
  SELECT
    p.table_name,
    CASE WHEN c.table_name IS NOT NULL THEN true ELSE false END AS exists
  FROM prerequisites p
  LEFT JOIN information_schema.tables c
    ON c.table_schema = 'public' AND c.table_name = p.table_name
),
-- =============================================================================
-- 2) Collision check: rt_* tables that would be created by 007
-- =============================================================================
rt_tables AS (
  SELECT unnest(ARRAY[
    'rt_accounts', 'rt_webhooks', 'rt_contacts', 'rt_contact_events', 'rt_jobs',
    'rt_segments', 'rt_segment_rules', 'rt_contact_segment_state',
    'rt_knowledge_banks', 'rt_knowledge_documents', 'rt_knowledge_chunks',
    'rt_segment_campaigns', 'rt_email_sends', 'rt_account_unsubscribes'
  ]) AS table_name
),
rt_check AS (
  SELECT
    t.table_name,
    CASE WHEN c.table_name IS NOT NULL THEN true ELSE false END AS already_exists
  FROM rt_tables t
  LEFT JOIN information_schema.tables c
    ON c.table_schema = 'public' AND c.table_name = t.table_name
),
-- =============================================================================
-- 3) Summary
-- =============================================================================
prereq_ok AS (
  SELECT count(*) FILTER (WHERE exists) = count(*) AS ok,
         count(*) FILTER (WHERE exists) AS passed,
         count(*) AS total
  FROM prereq_check
),
rt_any_exists AS (
  SELECT count(*) FILTER (WHERE already_exists) > 0 AS any_rt_exists
  FROM rt_check
)
SELECT
  CASE
    WHEN p.ok AND NOT r.any_rt_exists THEN 'OK'
    WHEN NOT p.ok THEN 'FAIL_PREREQ'
    WHEN r.any_rt_exists THEN 'FAIL_RT_EXISTS'
    ELSE 'UNKNOWN'
  END AS status,
  p.passed || '/' || p.total AS prerequisites_met,
  CASE
    WHEN NOT p.ok THEN 'Missing workspaces or user_workspaces. Run rb2b migrations 001-006 first.'
    WHEN r.any_rt_exists THEN 'Some rt_* tables already exist. Migration 007 may have been applied. Skip or re-run with care.'
    ELSE 'Safe to run 007_retarget_integration.sql'
  END AS action
FROM prereq_ok p, rt_any_exists r;

-- =============================================================================
-- 4) Per-table details: prerequisites and rt_* status
-- =============================================================================
WITH prerequisites AS (
  SELECT unnest(ARRAY['workspaces', 'user_workspaces']) AS table_name
),
prereq_check AS (
  SELECT
    p.table_name,
    CASE WHEN c.table_name IS NOT NULL THEN 'yes' ELSE 'MISSING' END AS exists
  FROM prerequisites p
  LEFT JOIN information_schema.tables c
    ON c.table_schema = 'public' AND c.table_name = p.table_name
),
rt_tables AS (
  SELECT unnest(ARRAY[
    'rt_accounts', 'rt_webhooks', 'rt_contacts', 'rt_contact_events', 'rt_jobs',
    'rt_segments', 'rt_segment_rules', 'rt_contact_segment_state',
    'rt_knowledge_banks', 'rt_knowledge_documents', 'rt_knowledge_chunks',
    'rt_segment_campaigns', 'rt_email_sends', 'rt_account_unsubscribes'
  ]) AS table_name
),
rt_check AS (
  SELECT
    t.table_name,
    CASE WHEN c.table_name IS NOT NULL THEN 'EXISTS' ELSE 'absent (will create)' END AS status
  FROM rt_tables t
  LEFT JOIN information_schema.tables c
    ON c.table_schema = 'public' AND c.table_name = t.table_name
)
SELECT 'prerequisite' AS kind, table_name AS name, exists AS status FROM prereq_check
UNION ALL
SELECT 'rt_table' AS kind, table_name AS name, status FROM rt_check
ORDER BY kind, name;
