-- Temporarily disable the trigger to allow signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- You can re-enable it later after fixing any issues
