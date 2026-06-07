-- Migration: Create HPP calculation functions
-- This creates the database functions required to calculate and update product HPP

-- Function to calculate HPP for a specific product
CREATE OR REPLACE FUNCTION calculate_product_hpp(product_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_hpp DECIMAL(10, 2) := 0;
BEGIN
  SELECT COALESCE(SUM(pr.quantity_used * rm.cost_per_unit), 0)
  INTO total_hpp
  FROM product_recipes pr
  JOIN raw_materials rm ON pr.raw_material_id = rm.id
  WHERE pr.product_id = product_uuid;
  
  RETURN total_hpp;
END;
$$ LANGUAGE plpgsql;

-- Function to update HPP for all products
CREATE OR REPLACE FUNCTION update_all_product_hpp()
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET hpp = calculate_product_hpp(id);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update HPP when recipes change
CREATE OR REPLACE FUNCTION update_product_hpp_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- After insert, update, or delete on product_recipes, recalculate HPP for the product
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM calculate_product_hpp(NEW.product_id);
    UPDATE products SET hpp = calculate_product_hpp(NEW.product_id) WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM calculate_product_hpp(OLD.product_id);
    UPDATE products SET hpp = calculate_product_hpp(OLD.product_id) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic HPP updates
DROP TRIGGER IF EXISTS trigger_update_hpp_after_insert ON product_recipes;
DROP TRIGGER IF EXISTS trigger_update_hpp_after_update ON product_recipes;
DROP TRIGGER IF EXISTS trigger_update_hpp_after_delete ON product_recipes;

CREATE TRIGGER trigger_update_hpp_after_insert
  AFTER INSERT ON product_recipes
  FOR EACH ROW EXECUTE FUNCTION update_product_hpp_trigger();

CREATE TRIGGER trigger_update_hpp_after_update
  AFTER UPDATE ON product_recipes
  FOR EACH ROW EXECUTE FUNCTION update_product_hpp_trigger();

CREATE TRIGGER trigger_update_hpp_after_delete
  AFTER DELETE ON product_recipes
  FOR EACH ROW EXECUTE FUNCTION update_product_hpp_trigger();

-- Verify functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_product_hpp', 'update_all_product_hpp', 'update_product_hpp_trigger');

-- Update all existing products with their HPP
SELECT update_all_product_hpp();

-- Verify HPP column exists in products table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'hpp';
