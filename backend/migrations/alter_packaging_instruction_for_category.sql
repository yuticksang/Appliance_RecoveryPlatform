-- Migration to restructure PackagingInstruction table for admin-managed category-based instructions
-- This changes from per-appliance instructions to reusable category-based instructions

-- Step 1: Drop existing PackagingInstruction table if it exists
DROP TABLE IF EXISTS "PackagingInstruction" CASCADE;

-- Step 2: Drop sequence if it exists
DROP SEQUENCE IF EXISTS packaging_instruction_id_seq CASCADE;

-- Step 3: Create new sequence for instruction IDs
CREATE SEQUENCE packaging_instruction_id_seq START 1;

-- Step 4: Create new PackagingInstruction table with category-based structure
-- Note: categoryID should match Category table's data type (likely VARCHAR or INTEGER)
CREATE TABLE "PackagingInstruction" (
    "instructionID" VARCHAR(10) PRIMARY KEY DEFAULT ('PI' || LPAD(nextval('packaging_instruction_id_seq')::text, 3, '0')),
    "categoryID" VARCHAR(20) NOT NULL, -- Changed to VARCHAR to match Category table
    "stepNumber" INTEGER NOT NULL,
    "sectionName" VARCHAR(100) NOT NULL, -- e.g., "Safety First", "Preparation Steps"
    "instruction" TEXT NOT NULL,
    "icon" VARCHAR(50), -- Optional icon identifier for UI
    "isActive" BOOLEAN DEFAULT true,
    "displayOrder" INTEGER NOT NULL, -- Order within the section
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Removed foreign key constraint to allow categoryID = '0' for default instructions
    CONSTRAINT unique_category_step UNIQUE ("categoryID", "stepNumber")
);

-- Step 5: Create indexes for faster lookups
CREATE INDEX idx_packaging_category ON "PackagingInstruction"("categoryID");
CREATE INDEX idx_packaging_active ON "PackagingInstruction"("isActive");
CREATE INDEX idx_packaging_section ON "PackagingInstruction"("sectionName");

-- Step 6: Create trigger to auto-update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_packaging_instruction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_packaging_timestamp
BEFORE UPDATE ON "PackagingInstruction"
FOR EACH ROW
EXECUTE FUNCTION update_packaging_instruction_timestamp();

-- Step 7: Insert default packaging instructions for all categories
-- These are general instructions that apply to all appliance categories
-- Admins can modify these or add category-specific instructions later

-- Category 1: Refrigerator (categoryID as string to match Category table format)
INSERT INTO "PackagingInstruction" ("categoryID", "stepNumber", "sectionName", "instruction", "icon", "displayOrder", "isActive") VALUES
('1', 1, 'Safety First', 'Disconnect power: Unplug the refrigerator from the electrical outlet at least 24 hours before pickup.', 'power', 1, true),
('1', 2, 'Safety First', 'Turn off water connections: Shut off and disconnect water supply lines if your refrigerator has an ice maker or water dispenser.', 'water', 2, true),
('1', 3, 'Safety First', 'Defrost completely: Refrigerators and freezers must be fully defrosted and dried to prevent water leakage during transit.', 'snowflake', 3, true),
('1', 4, 'Preparation Steps', 'Clean thoroughly: Wipe down all interior and exterior surfaces. Remove any food residue or debris.', 'clean', 1, true),
('1', 5, 'Preparation Steps', 'Drain all water: Empty water tanks, drain hoses, and remove all water from the system.', 'droplet', 2, true),
('1', 6, 'Preparation Steps', 'Remove loose parts: Take out all shelves, drawers, and racks. Pack them separately in a labeled bag.', 'box', 3, true),
('1', 7, 'Packaging Guidelines', 'Secure doors: Use strong packing tape or rope to secure all doors to prevent them from opening during transport.', 'tape', 1, true),
('1', 8, 'Packaging Guidelines', 'Wrap cables: Coil the power cord neatly and tape it to the back of the refrigerator.', 'cable', 2, true),
('1', 9, 'Documentation', 'Attach recovery slip: Print your recovery slip and tape it to the front of the refrigerator in a clear plastic sleeve.', 'document', 1, true);

-- Add a fallback "default" category instruction set (categoryID = '0' as VARCHAR for general use)
-- This will be used as fallback if no category-specific instructions exist
INSERT INTO "PackagingInstruction" ("instructionID", "categoryID", "stepNumber", "sectionName", "instruction", "icon", "displayOrder", "isActive") VALUES
('PI000', '0', 1, 'Safety First', 'Disconnect power: Unplug the appliance from the electrical outlet at least 24 hours before pickup.', 'power', 1, true),
('PI001', '0', 2, 'Safety First', 'Turn off utilities: For appliances with water or gas connections, shut off and disconnect all supply lines.', 'water', 2, true),
('PI002', '0', 3, 'Safety First', 'Allow cooling: Let appliances cool completely if they generate heat.', 'thermometer', 3, true),
('PI003', '0', 4, 'Preparation Steps', 'Clean thoroughly: Wipe down all interior and exterior surfaces. Remove any debris.', 'clean', 1, true),
('PI004', '0', 5, 'Preparation Steps', 'Drain all water: Empty water tanks and drain hoses completely.', 'droplet', 2, true),
('PI005', '0', 6, 'Preparation Steps', 'Remove loose parts: Take out all removable components and pack them separately.', 'box', 3, true),
('PI006', '0', 7, 'Packaging Guidelines', 'Protect fragile parts: Wrap glass doors and control panels with bubble wrap.', 'wrap', 1, true),
('PI007', '0', 8, 'Packaging Guidelines', 'Secure doors and lids: Use packing tape to secure all doors and access panels.', 'tape', 2, true),
('PI008', '0', 9, 'Packaging Guidelines', 'Wrap cables: Coil power cords neatly and tape them to the appliance.', 'cable', 3, true),
('PI009', '0', 10, 'Documentation', 'Attach recovery slip: Print your recovery slip and attach it to the appliance in a clear sleeve.', 'document', 1, true);

-- Add comments for documentation
COMMENT ON TABLE "PackagingInstruction" IS 'Stores admin-managed packaging instructions organized by category and section';
COMMENT ON COLUMN "PackagingInstruction"."instructionID" IS 'Primary key with format PI001, PI002, etc.';
COMMENT ON COLUMN "PackagingInstruction"."categoryID" IS 'Foreign key to Category table (0 for default/fallback instructions)';
COMMENT ON COLUMN "PackagingInstruction"."stepNumber" IS 'Sequential step number for ordering';
COMMENT ON COLUMN "PackagingInstruction"."sectionName" IS 'Section grouping (e.g., Safety First, Preparation Steps, Packaging Guidelines)';
COMMENT ON COLUMN "PackagingInstruction"."instruction" IS 'The actual instruction text';
COMMENT ON COLUMN "PackagingInstruction"."icon" IS 'Icon identifier for UI display (e.g., power, water, clean)';
COMMENT ON COLUMN "PackagingInstruction"."displayOrder" IS 'Order within the section';
COMMENT ON COLUMN "PackagingInstruction"."isActive" IS 'Whether this instruction is currently active';