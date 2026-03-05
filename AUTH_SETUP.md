# Enable Authentication in Supabase

Your app now has login and registration! Follow these steps to enable it:

## Step 1: Enable Email Auth in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/rokizehckcrdqjwqekon
2. Click "Authentication" in the left sidebar
3. Click "Providers"
4. Make sure "Email" is enabled (it should be by default)
5. Under "Auth" → "Settings" → "Email Templates", customize if needed

## Step 2: Update RLS Policies (Optional but Recommended)

To make data user-specific instead of public, run this SQL in your Supabase SQL Editor:

\`\`\`sql
-- Add user_id column to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update RLS policies to be user-specific
DROP POLICY IF EXISTS "activities_public_insert" ON activities;
DROP POLICY IF EXISTS "activities_public_select" ON activities;
DROP POLICY IF EXISTS "activities_public_update" ON activities;
DROP POLICY IF EXISTS "activities_public_delete" ON activities;

-- New user-specific policies
CREATE POLICY "users_insert_own_activities" ON activities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_select_own_activities" ON activities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_activities" ON activities
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_activities" ON activities
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
\`\`\`

Repeat for other tables (scouting_observations, market_deliveries, etc.)

## Step 3: Update Code to Include user_id

If you made tables user-specific, update your code to include user_id when creating records. I can help with this if needed!

## How It Works Now:

1. **New Users:**
   - Visit your app
   - Click "Sign up" on login page
   - Create account with email + password
   - Automatically logged in

2. **Existing Users:**
   - Visit your app
   - Enter email + password
   - Access all their data

3. **Security:**
   - All pages require login
   - Each user only sees their own data (if RLS updated)
   - Sessions persist across visits
   - Automatic logout after inactivity

## Test It:

1. Refresh your app: http://localhost:5173
2. You'll be redirected to login
3. Click "Sign up" to create an account
4. Access all modules as before

## Features:

✅ Email/password registration
✅ Login page with validation
✅ Protected routes (redirects to login if not signed in)
✅ Sign out button in header menu
✅ Session persistence
✅ User email displayed in menu
✅ Beautiful, mobile-friendly auth UI

Want me to also add user-specific data filtering so each user only sees their own farm data?
