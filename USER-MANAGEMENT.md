# User Deletion Issue - Root Cause and Solution

## Problem

User deletion from Supabase Auth fails with error: "Database error deleting user"

## Root Cause Analysis

### Foreign Key Dependency Chain

The database has a foreign key dependency chain that blocks user deletion:

```
auth.users (Supabase Auth)
    ↓ (PRIMARY KEY reference)
profiles (public schema)
    ↓ (foreign key references)
├── sales.created_by
├── stock_movements.created_by
├── daily_production.created_by
└── waste_items.created_by
```

### Specific Dependencies

1. **profiles.id** → references `auth.users(id)` (PRIMARY KEY)
2. **sales.created_by** → references `profiles(id)` (no ON DELETE CASCADE)
3. **stock_movements.created_by** → references `profiles(id)` (no ON DELETE CASCADE)
4. **daily_production.created_by** → references `profiles(id)` (no ON DELETE CASCADE)
5. **waste_items.created_by** → references `profiles(id)` (no ON DELETE CASCADE)

### Why Deletion Fails

When you try to delete a user from Supabase Auth:
1. The profiles table has a foreign key to auth.users (id)
2. Multiple tables (sales, stock_movements, daily_production, waste_items) have foreign keys to profiles(id)
3. None of these foreign keys have ON DELETE CASCADE
4. PostgreSQL prevents deletion to maintain referential integrity

## Solution

### Safe Migration: ON DELETE SET NULL

The migration changes foreign key constraints to use `ON DELETE SET NULL` instead of blocking deletion.

**What this does:**
- When a user is deleted from auth.users, their profile is automatically deleted
- The `created_by` fields in dependent tables are set to NULL instead of blocking deletion
- All production data (sales, stock movements, etc.) is preserved
- Only the user reference is cleared

**Files Created:**

1. **inspect-dependencies.sql** - Run this first to see current dependencies
2. **fix-user-deletion.sql** - Run this to apply the safe migration

### How to Apply the Fix

1. **Inspect current dependencies:**
   ```sql
   -- Run inspect-dependencies.sql in Supabase SQL Editor
   -- This will show you which users have dependent data
   ```

2. **Apply the migration:**
   ```sql
   -- Run fix-user-deletion.sql in Supabase SQL Editor
   -- This changes foreign key constraints to ON DELETE SET NULL
   ```

3. **Verify the fix:**
   ```sql
   -- The verification query in fix-user-deletion.sql will show the new constraints
   -- Check that delete_rule is now 'SET NULL' for all dependent tables
   ```

### After Migration

**User Deletion:**
- Users can now be deleted from Supabase Auth without errors
- Dependent data (sales, stock movements, etc.) is preserved
- `created_by` fields will be NULL for deleted users

**User Recreation:**
- You can recreate users with the same email
- New users will get a new UUID from Supabase Auth
- A new profile will be created automatically by the trigger
- Old data will have NULL `created_by` values

**Password Reset:**
- Use Supabase Auth's built-in password reset functionality
- No need to delete and recreate users
- This is the recommended approach for password management

## Alternative: Password Reset (Recommended)

Instead of deleting users, use Supabase Auth's password reset:

```javascript
// In your application code
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
})
```

This preserves all user data and is the standard approach for password management.

## Data Preservation

**What is preserved:**
- All sales records
- All stock movements
- All daily production records
- All waste items
- All products
- All suppliers

**What is changed:**
- `created_by` fields become NULL for deleted users
- Profile record is deleted when auth user is deleted

## Rollback (If Needed)

If you need to revert the changes:

```sql
-- Drop the new constraints
ALTER TABLE sales DROP CONSTRAINT sales_created_by_fkey;
ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_created_by_fkey;
ALTER TABLE daily_production DROP CONSTRAINT daily_production_created_by_fkey;
ALTER TABLE waste_items DROP CONSTRAINT waste_items_created_by_fkey;

-- Re-add original constraints (without ON DELETE SET NULL)
ALTER TABLE sales ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE daily_production ADD CONSTRAINT daily_production_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE waste_items ADD CONSTRAINT waste_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
```

## Summary

- **Problem:** Foreign key dependencies block user deletion
- **Solution:** Change constraints to ON DELETE SET NULL
- **Result:** Users can be deleted, data is preserved
- **Alternative:** Use password reset instead of deletion
- **Files:** inspect-dependencies.sql, fix-user-deletion.sql
