-- Check Brand table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Brand'
ORDER BY ordinal_position;

-- Check Category table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Category'
ORDER BY ordinal_position;
