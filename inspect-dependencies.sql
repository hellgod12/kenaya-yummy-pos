-- SQL to inspect foreign key dependencies blocking user deletion
-- Run this in Supabase SQL Editor to see all dependencies

-- 1. Check foreign keys referencing auth.users
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE
  tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND ccu.table_schema = 'auth'
ORDER BY
  tc.table_name;

-- 2. Check foreign keys referencing profiles
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE
  tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
  AND ccu.table_schema = 'public'
ORDER BY
  tc.table_name;

-- 3. Check which users have dependent data
SELECT
  p.id,
  p.email,
  p.name,
  p.role,
  COUNT(DISTINCT s.id) as sales_count,
  COUNT(DISTINCT sm.id) as stock_movements_count,
  COUNT(DISTINCT dp.id) as daily_production_count,
  COUNT(DISTINCT wi.id) as waste_items_count
FROM
  profiles p
  LEFT JOIN sales s ON p.id = s.created_by
  LEFT JOIN stock_movements sm ON p.id = sm.created_by
  LEFT JOIN daily_production dp ON p.id = dp.created_by
  LEFT JOIN waste_items wi ON p.id = wi.created_by
GROUP BY
  p.id, p.email, p.name, p.role
ORDER BY
  p.email;

-- 4. Check specific foreign key constraints on profiles table
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS foreign_table_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM
  pg_constraint con
  JOIN pg_namespace nsp ON nsp.oid = con.connamespace
WHERE
  con.contype = 'f'
  AND conrelid::regclass = 'profiles'::regclass
ORDER BY
  conname;
