-- ============================================
-- SUPABASE SQL - Brand, Category, and Appliance Records
-- Run this AFTER adding image_url column to Appliance table
-- ============================================

-- Insert Brands (3 brands)
INSERT INTO "Brand" ("brandID", "brandName") VALUES
('BRD001', 'LG'),
('BRD002', 'SAMSUNG'),
('BRD003', 'PANASONIC');

-- Insert Categories (4 categories)
INSERT INTO "Category" ("categoryID", "categoryName") VALUES
('CAT001', 'Washing Machine'),
('CAT002', 'Microwave'),
('CAT003', 'Refrigerators'),
('CAT004', 'Air Conditioners');

-- Insert Appliances
INSERT INTO "Appliance" ("applianceID", "brandID", "categoryID", "modelCode", "modelName", image_url) VALUES
('APL001', 'BRD001', 'CAT001', 'FB120956M', '9kg Front Load Washer with 6 motion Inverter Direct Drive', 'assets/image/placeholder-appliance.png'),
('APL002', 'BRD002', 'CAT001', 'FV120D4W', '9/5kg Front Load Washer Dryer with AI Direct Drive, Steam', 'assets/image/placeholder-appliance.png'),
('APL003', 'BRD003', 'CAT002', 'NN-ST34H', 'Panasonic 25L Solo Microwave Oven', 'assets/image/placeholder-appliance.png'),
('APL004', 'BRD001', 'CAT004', 'S3-Q12JA3WF', 'LG Dual Inverter 1.5HP Air Conditioner', 'assets/image/placeholder-appliance.png'),
('APL005', 'BRD002', 'CAT004', 'AR13TXHQASINME', 'Samsung WindFree 1.5HP Inverter Air Conditioner', 'assets/image/placeholder-appliance.png'),
('APL006', 'BRD001', 'CAT003', 'GC-B247SLUV', 'LG 668L Side by Side Refrigerator', 'assets/image/placeholder-appliance.png'),
('APL007', 'BRD002', 'CAT003', 'RT35K5032S8', 'Samsung 345L 2-Door Refrigerator', 'assets/image/placeholder-appliance.png'),
('APL008', 'BRD003', 'CAT002', 'NN-DS596B', 'Panasonic 27L Steam Microwave Oven', 'assets/image/placeholder-appliance.png'),
('APL009', 'BRD001', 'CAT002', 'MH6535GIB', 'LG 25L NeoChef Microwave', 'assets/image/placeholder-appliance.png'),
('APL010', 'BRD002', 'CAT002', 'MS23K3513AK', 'Samsung 23L Microwave Oven', 'assets/image/placeholder-appliance.png'),
('APL011', 'BRD003', 'CAT003', 'NR-BX471GPKM', 'Panasonic 450L Multi-Door Refrigerator', 'assets/image/placeholder-appliance.png'),
('APL012', 'BRD001', 'CAT001', 'FV1409S2W', 'LG 9/5kg Washer Dryer', 'assets/image/placeholder-appliance.png'),
('APL013', 'BRD002', 'CAT001', 'WW90TP44DSH', 'Samsung 9kg Front Load Washer', 'assets/image/placeholder-appliance.png'),
('APL014', 'BRD003', 'CAT001', 'NA-F80A1', 'Panasonic 8kg Top Load Washer', 'assets/image/placeholder-appliance.png'),
('APL015', 'BRD003', 'CAT004', 'CS-PU9VKH', 'Panasonic 1.0HP Standard Air Conditioner', 'assets/image/placeholder-appliance.png');

-- Verify insertion
SELECT
  a."applianceID",
  b."brandName" as brand,
  c."categoryName" as category,
  a."modelCode",
  a."modelName"
FROM "Appliance" a
JOIN "Brand" b ON a."brandID" = b."brandID"
JOIN "Category" c ON a."categoryID" = c."categoryID"
ORDER BY a."applianceID";
