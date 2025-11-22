-- ============================================
-- Add image_url column to Appliance table
-- Run this SQL in Supabase SQL Editor
-- ============================================

ALTER TABLE "Appliance"
ADD COLUMN image_url VARCHAR(500);

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'Appliance'
ORDER BY ordinal_position;
