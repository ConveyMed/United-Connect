-- Account deletion RPCs. NEITHER was in the template SQL before (dashboard-only on live apps),
-- so fresh dupes hit "Failed to delete account" / admins couldn't delete users. Run AFTER users.sql.

-- Self-service: a logged-in user deletes THEIR OWN account (profile + auth login).
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.users WHERE id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END; $$;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Admin: delete ANOTHER user (profile + auth login). Gated to admins/owners.
-- The app's ManageUsers screen calls this via rpc('admin_delete_user', { target_id }).
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin OR is_owner)) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  DELETE FROM public.users WHERE id = target_id;
  DELETE FROM auth.users WHERE id = target_id;
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
