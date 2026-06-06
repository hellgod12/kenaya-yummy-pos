-- Row Level Security (RLS) Policies for Kenaya Yummy POS
-- This migration adds security policies to protect business logic data
-- Run this AFTER supabase-schema.sql and supabase-auth-migration.sql

-- Enable RLS on all business logic tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PRODUCTS TABLE POLICIES
-- ============================================================================

-- Admins can do everything with products
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cashiers can only view products (for POS)
CREATE POLICY "Cashiers can view products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'kasir'
    )
  );

-- ============================================================================
-- SALES TABLE POLICIES
-- ============================================================================

-- Admins can view all sales
CREATE POLICY "Admins can view all sales"
  ON sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cashiers can view their own sales
CREATE POLICY "Cashiers can view own sales"
  ON sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'kasir'
    )
    AND created_by = auth.uid()
  );

-- Both roles can insert sales (for POS)
CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Admins can update sales (for corrections)
CREATE POLICY "Admins can update sales"
  ON sales FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No delete policy - sales should not be deleted

-- ============================================================================
-- SALE_ITEMS TABLE POLICIES
-- ============================================================================

-- Admins can view all sale items
CREATE POLICY "Admins can view all sale items"
  ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cashiers can view sale items from their own sales
CREATE POLICY "Cashiers can view own sale items"
  ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'kasir'
    )
    AND EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.created_by = auth.uid()
    )
  );

-- Both roles can insert sale items (for POS)
CREATE POLICY "Authenticated users can insert sale items"
  ON sale_items FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.created_by = auth.uid()
    )
  );

-- No update or delete policies - sale items should not be modified

-- ============================================================================
-- STOCK_MOVEMENTS TABLE POLICIES
-- ============================================================================

-- Admins can view all stock movements
CREATE POLICY "Admins can view all stock movements"
  ON stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cashiers can view stock movements from their own operations
CREATE POLICY "Cashiers can view own stock movements"
  ON stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'kasir'
    )
    AND created_by = auth.uid()
  );

-- Admins can insert stock movements
CREATE POLICY "Admins can insert stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND created_by = auth.uid()
  );

-- Cashiers can insert stock movements (for POS - stock out)
CREATE POLICY "Cashiers can insert stock movements for POS"
  ON stock_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'kasir'
    )
    AND created_by = auth.uid()
    AND type = 'out'
  );

-- No update or delete policies - stock movements should not be modified

-- ============================================================================
-- DAILY_PRODUCTION TABLE POLICIES
-- ============================================================================

-- Admins can view all daily production records
CREATE POLICY "Admins can view all daily production"
  ON daily_production FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert daily production records
CREATE POLICY "Admins can insert daily production"
  ON daily_production FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND created_by = auth.uid()
  );

-- Admins can update daily production records
CREATE POLICY "Admins can update daily production"
  ON daily_production FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cashiers have no access to daily production

-- ============================================================================
-- WASTE_ITEMS TABLE POLICIES
-- ============================================================================

-- Admins can view all waste items
CREATE POLICY "Admins can view all waste items"
  ON waste_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert waste items
CREATE POLICY "Admins can insert waste items"
  ON waste_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND created_by = auth.uid()
  );

-- Cashiers have no access to waste items

-- ============================================================================
-- SUPPLIERS TABLE POLICIES
-- ============================================================================

-- Admins can view all suppliers
CREATE POLICY "Admins can view all suppliers"
  ON suppliers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert suppliers
CREATE POLICY "Admins can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update suppliers
CREATE POLICY "Admins can update suppliers"
  ON suppliers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete suppliers
CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cashiers have no access to suppliers

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- These policies ensure:
-- 1. Admins have full access to all business logic data
-- 2. Cashiers can only:
--    - View products (for POS)
--    - Create sales and sale items (POS operations)
--    - Create stock movements of type 'out' (automatic from POS)
--    - View their own sales and stock movements
-- 3. All operations are tied to the authenticated user's ID
-- 4. No data can be modified without proper authentication
