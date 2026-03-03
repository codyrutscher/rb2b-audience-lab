-- Backfill: Give an existing auth user a workspace so they can use the dashboard and Reactivate.
-- Run this in Supabase SQL Editor (as a user with permission to insert into workspaces and user_workspaces).
-- Replace the user_id below with your auth user's id (from debug-auth: steps.4_getUser.userId).

DO $$
DECLARE
  v_user_id UUID := '4ea46900-5a85-425c-9eff-53bf004c6031';
  v_workspace_id UUID;
BEGIN
  -- If user already has a workspace, do nothing
  IF EXISTS (SELECT 1 FROM user_workspaces WHERE user_id = v_user_id) THEN
    RAISE NOTICE 'User already has a workspace.';
    RETURN;
  END IF;

  -- Create a new workspace for this user
  INSERT INTO workspaces (name, created_at, updated_at)
  VALUES ('My Workspace', NOW(), NOW())
  RETURNING id INTO v_workspace_id;

  -- Link user to workspace as owner
  INSERT INTO user_workspaces (user_id, workspace_id, role)
  VALUES (v_user_id, v_workspace_id, 'owner');

  RAISE NOTICE 'Created workspace % and linked user.', v_workspace_id;
END $$;

-- Trigger on workspaces will create rt_account + webhook for the new workspace (if migration 007 is applied).
-- If not, run: INSERT INTO rt_accounts (workspace_id, created_at, updated_at) SELECT id, NOW(), NOW() FROM workspaces WHERE id = (SELECT workspace_id FROM user_workspaces WHERE user_id = '4ea46900-5a85-425c-9eff-53bf004c6031' LIMIT 1);
-- Then: INSERT INTO rt_webhooks (account_id, created_at, updated_at) SELECT id, NOW(), NOW() FROM rt_accounts WHERE workspace_id = (SELECT workspace_id FROM user_workspaces WHERE user_id = '4ea46900-5a85-425c-9eff-53bf004c6031' LIMIT 1);
