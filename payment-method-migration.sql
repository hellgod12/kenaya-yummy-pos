-- Migration: Add payment_method column to sales table
-- This adds support for different payment methods (cash, transfer)

-- Add payment_method column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Add check constraint to ensure only valid payment methods
ALTER TABLE sales 
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IN ('cash', 'transfer'));

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name = 'payment_method';

-- Update existing records to have 'cash' as default (if any NULL values exist)
UPDATE sales 
SET payment_method = 'cash' 
WHERE payment_method IS NULL;
