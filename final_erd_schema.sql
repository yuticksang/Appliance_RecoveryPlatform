-- Complete EasyRecovery Database Schema - Exact match to ERD
-- All tables with string IDs (capital ID format)
-- WARNING: This will DELETE ALL DATA! Back up your database before running!

BEGIN;

-- =====================================================
-- STEP 1: Drop all existing tables
-- =====================================================

DROP TABLE IF EXISTS "Category_Condition" CASCADE;
DROP TABLE IF EXISTS "BuyerMarkdown" CASCADE;
DROP TABLE IF EXISTS "Category_ConditionGroup" CASCADE;
DROP TABLE IF EXISTS "BuyerAppliance" CASCADE;
DROP TABLE IF EXISTS "ConditionOption" CASCADE;
DROP TABLE IF EXISTS "ConditionGroup" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Brand" CASCADE;
DROP TABLE IF EXISTS "Appliance" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "PackagingInstruction" CASCADE;
DROP TABLE IF EXISTS "Score" CASCADE;
DROP TABLE IF EXISTS "ConditionSelected" CASCADE;
DROP TABLE IF EXISTS "Photo" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "SummaryReport" CASCADE;
DROP TABLE IF EXISTS "Pickup" CASCADE;
DROP TABLE IF EXISTS "RecoverySlip" CASCADE;
DROP TABLE IF EXISTS "ItemStatus" CASCADE;
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "TransactionReport" CASCADE;
DROP TABLE IF EXISTS "SubmittedAppliance" CASCADE;
DROP TABLE IF EXISTS "PickupAddress" CASCADE;
DROP TABLE IF EXISTS "SellerBank" CASCADE;
DROP TABLE IF EXISTS "Buyer" CASCADE;
DROP TABLE IF EXISTS "Admin" CASCADE;
DROP TABLE IF EXISTS "Seller" CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- STEP 2: Drop and recreate sequences
-- =====================================================

DROP SEQUENCE IF EXISTS user_id_seq CASCADE;
DROP SEQUENCE IF EXISTS auth_token_id_seq CASCADE;
DROP SEQUENCE IF EXISTS seller_bank_id_seq CASCADE;
DROP SEQUENCE IF EXISTS pickup_address_id_seq CASCADE;
DROP SEQUENCE IF EXISTS transaction_report_id_seq CASCADE;
DROP SEQUENCE IF EXISTS transaction_id_seq CASCADE;
DROP SEQUENCE IF EXISTS item_status_id_seq CASCADE;
DROP SEQUENCE IF EXISTS recovery_slip_id_seq CASCADE;
DROP SEQUENCE IF EXISTS pickup_id_seq CASCADE;
DROP SEQUENCE IF EXISTS summary_report_id_seq CASCADE;
DROP SEQUENCE IF EXISTS submitted_appliance_id_seq CASCADE;
DROP SEQUENCE IF EXISTS photo_id_seq CASCADE;
DROP SEQUENCE IF EXISTS condition_selected_id_seq CASCADE;
DROP SEQUENCE IF EXISTS score_id_seq CASCADE;
DROP SEQUENCE IF EXISTS packaging_instruction_id_seq CASCADE;
DROP SEQUENCE IF EXISTS review_id_seq CASCADE;
DROP SEQUENCE IF EXISTS appliance_id_seq CASCADE;
DROP SEQUENCE IF EXISTS brand_id_seq CASCADE;
DROP SEQUENCE IF EXISTS category_id_seq CASCADE;
DROP SEQUENCE IF EXISTS condition_group_id_seq CASCADE;
DROP SEQUENCE IF EXISTS condition_option_id_seq CASCADE;
DROP SEQUENCE IF EXISTS notification_id_seq CASCADE;

CREATE SEQUENCE user_id_seq START WITH 1;
CREATE SEQUENCE auth_token_id_seq START WITH 1;
CREATE SEQUENCE seller_bank_id_seq START WITH 1;
CREATE SEQUENCE pickup_address_id_seq START WITH 1;
CREATE SEQUENCE transaction_report_id_seq START WITH 1;
CREATE SEQUENCE transaction_id_seq START WITH 1;
CREATE SEQUENCE item_status_id_seq START WITH 1;
CREATE SEQUENCE recovery_slip_id_seq START WITH 1;
CREATE SEQUENCE pickup_id_seq START WITH 1;
CREATE SEQUENCE summary_report_id_seq START WITH 1;
CREATE SEQUENCE submitted_appliance_id_seq START WITH 1;
CREATE SEQUENCE photo_id_seq START WITH 1;
CREATE SEQUENCE condition_selected_id_seq START WITH 1;
CREATE SEQUENCE score_id_seq START WITH 1;
CREATE SEQUENCE packaging_instruction_id_seq START WITH 1;
CREATE SEQUENCE review_id_seq START WITH 1;
CREATE SEQUENCE appliance_id_seq START WITH 1;
CREATE SEQUENCE brand_id_seq START WITH 1;
CREATE SEQUENCE category_id_seq START WITH 1;
CREATE SEQUENCE condition_group_id_seq START WITH 1;
CREATE SEQUENCE condition_option_id_seq START WITH 1;
CREATE SEQUENCE notification_id_seq START WITH 1;

-- =====================================================
-- STEP 3: Create 
 table (unified for all user types)
-- =====================================================

CREATE TABLE users (
    "userID" VARCHAR(20) PRIMARY KEY DEFAULT ('U' || LPAD(nextval('user_id_seq')::text, 3, '0')),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'superadmin', 'buyer', 'seller')),
    user_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (user_status IN ('ACTIVE', 'INACTIVE')),
    admin_role VARCHAR(50),
    admin_id VARCHAR(10),
    buyer_id VARCHAR(10),
    seller_id VARCHAR(10),
    email_verified BOOLEAN DEFAULT false,
    can_change_password BOOLEAN DEFAULT true,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_user_type ON users(user_type);

-- =====================================================
-- STEP 4: Create auth_tokens table
-- =====================================================

CREATE TABLE auth_tokens (
    "tokenID" VARCHAR(20) PRIMARY KEY DEFAULT ('TKN' || LPAD(nextval('auth_token_id_seq')::text, 3, '0')),
    token VARCHAR(255) NOT NULL UNIQUE,
    "userID" VARCHAR(20) NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userID") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX idx_auth_tokens_userID ON auth_tokens("userID");

-- =====================================================
-- STEP 5: Create SellerBank table
-- =====================================================

CREATE TABLE "SellerBank" (
    "bankID" VARCHAR(20) PRIMARY KEY DEFAULT ('BNK' || LPAD(nextval('seller_bank_id_seq')::text, 3, '0')),
    "sellerID" VARCHAR(20) NOT NULL,
    "bankName" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(255) NOT NULL,
    "accountHolderName" VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sellerID") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX idx_seller_bank_sellerID ON "SellerBank"("sellerID");

-- =====================================================
-- STEP 6: Create PickupAddress table
-- =====================================================

CREATE TABLE "PickupAddress" (
    "addressID" VARCHAR(20) PRIMARY KEY DEFAULT ('PA' || LPAD(nextval('pickup_address_id_seq')::text, 3, '0')),
    "sellerID" VARCHAR(20) NOT NULL,
    "receiverName" VARCHAR(255) NOT NULL,
    "phoneNum" VARCHAR(50) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    "zipCode" VARCHAR(20) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "isDefault" BOOLEAN DEFAULT false,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sellerID") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX idx_pickup_address_sellerID ON "PickupAddress"("sellerID");

-- =====================================================
-- STEP 7: Create Brand table
-- =====================================================

CREATE TABLE "Brand" (
    "brandID" VARCHAR(20) PRIMARY KEY DEFAULT ('BRD' || LPAD(nextval('brand_id_seq')::text, 3, '0')),
    "brandName" VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 8: Create Category table
-- =====================================================

CREATE TABLE "Category" (
    "categoryID" VARCHAR(20) PRIMARY KEY DEFAULT ('CAT' || LPAD(nextval('category_id_seq')::text, 3, '0')),
    "categoryName" VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 9: Create Appliance table
-- =====================================================

CREATE TABLE "Appliance" (
    "applianceID" VARCHAR(20) PRIMARY KEY DEFAULT ('APL' || LPAD(nextval('appliance_id_seq')::text, 3, '0')),
    "categoryID" VARCHAR(20) NOT NULL,
    "brandID" VARCHAR(20) NOT NULL,
    "modelCode" VARCHAR(100) NOT NULL UNIQUE,
    "modelName" VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("categoryID") REFERENCES "Category"("categoryID") ON DELETE RESTRICT,
    FOREIGN KEY ("brandID") REFERENCES "Brand"("brandID") ON DELETE RESTRICT
);

CREATE INDEX idx_appliance_categoryID ON "Appliance"("categoryID");
CREATE INDEX idx_appliance_brandID ON "Appliance"("brandID");

-- =====================================================
-- STEP 10: Create ConditionGroup table
-- =====================================================

CREATE TABLE "ConditionGroup" (
    "groupID" VARCHAR(20) PRIMARY KEY DEFAULT ('CG' || LPAD(nextval('condition_group_id_seq')::text, 3, '0')),
    "criteriaName" VARCHAR(255) NOT NULL,
    "criteriaCodePrefix" VARCHAR(10),
    question_title TEXT,
    question_type VARCHAR(50),
    display_order INTEGER,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 11: Create ConditionOption table
-- =====================================================

CREATE TABLE "ConditionOption" (
    "conditionID" VARCHAR(20) PRIMARY KEY DEFAULT ('CO' || LPAD(nextval('condition_option_id_seq')::text, 3, '0')),
    "groupID" VARCHAR(20),
    code VARCHAR(50),
    description TEXT,
    image TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    question TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("groupID") REFERENCES "ConditionGroup"("groupID") ON DELETE SET NULL
);

CREATE INDEX idx_condition_option_groupID ON "ConditionOption"("groupID");

-- =====================================================
-- STEP 12: Create Category_ConditionGroup junction table
-- =====================================================

CREATE TABLE "Category_ConditionGroup" (
    "groupID" VARCHAR(20) NOT NULL,
    "categoryID" VARCHAR(20) NOT NULL,
    "weightPercentage" DECIMAL(5,2),
    PRIMARY KEY ("groupID", "categoryID"),
    FOREIGN KEY ("groupID") REFERENCES "ConditionGroup"("groupID") ON DELETE CASCADE,
    FOREIGN KEY ("categoryID") REFERENCES "Category"("categoryID") ON DELETE CASCADE
);

-- =====================================================
-- STEP 13: Create Category_Condition junction table
-- =====================================================

CREATE TABLE "Category_Condition" (
    "conditionID" VARCHAR(20) NOT NULL,
    "categoryID" VARCHAR(20) NOT NULL,
    "scoreValue" DECIMAL(5,2),
    PRIMARY KEY ("conditionID", "categoryID"),
    FOREIGN KEY ("conditionID") REFERENCES "ConditionOption"("conditionID") ON DELETE CASCADE,
    FOREIGN KEY ("categoryID") REFERENCES "Category"("categoryID") ON DELETE CASCADE
);

-- =====================================================
-- STEP 14: Create SubmittedAppliance table
-- =====================================================

CREATE TABLE "SubmittedAppliance" (
    "submittedApplianceID" VARCHAR(20) PRIMARY KEY DEFAULT ('SA' || LPAD(nextval('submitted_appliance_id_seq')::text, 3, '0')),
    "sellerID" VARCHAR(20) NOT NULL,
    "applianceID" VARCHAR(20),
    "addressID" VARCHAR(20),
    "submissionDate" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "initialOfferPrice" DECIMAL(10,2),
    "finalOfferPrice" DECIMAL(10,2),
    "initialScore" DECIMAL(10,2),
    "finalScore" DECIMAL(10,2),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sellerID") REFERENCES users("userID") ON DELETE CASCADE,
    FOREIGN KEY ("applianceID") REFERENCES "Appliance"("applianceID") ON DELETE SET NULL,
    FOREIGN KEY ("addressID") REFERENCES "PickupAddress"("addressID") ON DELETE SET NULL
);

CREATE INDEX idx_submitted_appliance_sellerID ON "SubmittedAppliance"("sellerID");

-- =====================================================
-- STEP 15: Create Photo table
-- =====================================================

CREATE TABLE "Photo" (
    "photoID" VARCHAR(20) PRIMARY KEY DEFAULT ('PHO' || LPAD(nextval('photo_id_seq')::text, 3, '0')),
    "submittedApplianceID" VARCHAR(20) NOT NULL,
    "photoURL" TEXT,
    "uploadDate" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    remark TEXT,
    FOREIGN KEY ("submittedApplianceID") REFERENCES "SubmittedAppliance"("submittedApplianceID") ON DELETE CASCADE
);

CREATE INDEX idx_photo_submittedApplianceID ON "Photo"("submittedApplianceID");

-- =====================================================
-- STEP 16: Create ConditionSelected table
-- =====================================================

CREATE TABLE "ConditionSelected" (
    "conditionSelectionID" VARCHAR(20) PRIMARY KEY DEFAULT ('CS' || LPAD(nextval('condition_selected_id_seq')::text, 3, '0')),
    "conditionID" VARCHAR(20) NOT NULL,
    "submittedApplianceID" VARCHAR(20) NOT NULL,
    "isChecked" BOOLEAN DEFAULT false,
    "selectedBy" character varying(20) COLLATE pg_catalog."default" DEFAULT 'seller'::character varying,
    "selectedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "textValue" text COLLATE pg_catalog."default",
    "groupID" character varying(10) COLLATE pg_catalog."default",
    score numeric,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("submittedApplianceID") REFERENCES "SubmittedAppliance"("submittedApplianceID") ON DELETE CASCADE,
    FOREIGN KEY ("conditionID") REFERENCES "ConditionOption"("conditionID") ON DELETE CASCADE
);

CREATE INDEX idx_condition_selected_submittedApplianceID ON "ConditionSelected"("submittedApplianceID");



-- =====================================================
-- STEP 19: Create Review table
-- =====================================================

CREATE TABLE "Review" (
    "reviewID" VARCHAR(20) PRIMARY KEY DEFAULT ('REV' || LPAD(nextval('review_id_seq')::text, 3, '0')),
    "adminID" VARCHAR(20) NOT NULL,
    "submittedApplianceID" VARCHAR(20) NOT NULL,
    "reviewDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("adminID") REFERENCES users("userID") ON DELETE CASCADE,
    FOREIGN KEY ("submittedApplianceID") REFERENCES "SubmittedAppliance"("submittedApplianceID") ON DELETE CASCADE
);

CREATE INDEX idx_review_adminID ON "Review"("adminID");
CREATE INDEX idx_review_submittedApplianceID ON "Review"("submittedApplianceID");

-- =====================================================
-- STEP 20: Create Notification table
-- =====================================================

CREATE TABLE "Notification" (
    "notificationID" VARCHAR(20) PRIMARY KEY DEFAULT ('NOT' || LPAD(nextval('notification_id_seq')::text, 3, '0')),
    "sellerID" VARCHAR(20) NOT NULL,
    "adminID" VARCHAR(20),
    "submittedApplianceID" VARCHAR(20),
    message TEXT NOT NULL,
    "dateSent" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sellerID") REFERENCES users("userID") ON DELETE CASCADE,
    FOREIGN KEY ("adminID") REFERENCES users("userID") ON DELETE SET NULL,
    FOREIGN KEY ("submittedApplianceID") REFERENCES "SubmittedAppliance"("submittedApplianceID") ON DELETE SET NULL
);

CREATE INDEX idx_notification_sellerID ON "Notification"("sellerID");

-- =====================================================
-- STEP 21: Create TransactionReport table
-- =====================================================

CREATE TABLE "TransactionReport" (
    "transactionReportID" VARCHAR(20) PRIMARY KEY DEFAULT ('TRP' || LPAD(nextval('transaction_report_id_seq')::text, 3, '0')),
    "transactionID" VARCHAR(20),
    "adminID" VARCHAR(20) NOT NULL,
    format VARCHAR(50),
    "generatedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("adminID") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX idx_transaction_report_adminID ON "TransactionReport"("adminID");

-- =====================================================
-- STEP 22: Create Transaction table
-- =====================================================

CREATE TABLE "Transaction" (
    "transactionID" VARCHAR(20) PRIMARY KEY DEFAULT ('TRN' || LPAD(nextval('transaction_id_seq')::text, 3, '0')),
    "submittedApplianceID" VARCHAR(20) NOT NULL,
    "sellerID" VARCHAR(20) NOT NULL,
    "buyerID" VARCHAR(20),
    "transactionStatus" VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "responseDeadline" TIMESTAMP,
    "rejectionReason" TEXT,
    "paymentDueDate" TIMESTAMP,
    FOREIGN KEY ("submittedApplianceID") REFERENCES "SubmittedAppliance"("submittedApplianceID") ON DELETE CASCADE,
    FOREIGN KEY ("sellerID") REFERENCES users("userID") ON DELETE CASCADE,
    FOREIGN KEY ("buyerID") REFERENCES users("userID") ON DELETE SET NULL
);

CREATE INDEX idx_transaction_submittedApplianceID ON "Transaction"("submittedApplianceID");
CREATE INDEX idx_transaction_sellerID ON "Transaction"("sellerID");

-- =====================================================
-- STEP 23: Create ItemStatus table
-- =====================================================

CREATE TABLE "ItemStatus" (
    "itemStatusID" VARCHAR(20) PRIMARY KEY DEFAULT ('IST' || LPAD(nextval('item_status_id_seq')::text, 3, '0')),
    "transactionID" VARCHAR(20) NOT NULL,
    "itemStatus" VARCHAR(100),
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("transactionID") REFERENCES "Transaction"("transactionID") ON DELETE CASCADE
);

CREATE INDEX idx_item_status_transactionID ON "ItemStatus"("transactionID");

-- =====================================================
-- STEP 24: Create RecoverySlip table
-- =====================================================

CREATE TABLE "RecoverySlip" (
    "slipNo" VARCHAR(20) PRIMARY KEY DEFAULT ('RSL' || LPAD(nextval('recovery_slip_id_seq')::text, 3, '0')),
    "submittedApplianceID" VARCHAR(20) NOT NULL,
    "generatedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("submittedApplianceID") REFERENCES "SubmittedAppliance"("submittedApplianceID") ON DELETE CASCADE
);

CREATE INDEX idx_recovery_slip_submittedApplianceID ON "RecoverySlip"("submittedApplianceID");

-- =====================================================
-- STEP 25: Create Pickup table
-- =====================================================

CREATE TABLE "Pickup" (
    "pickupID" VARCHAR(20) PRIMARY KEY DEFAULT ('PKP' || LPAD(nextval('pickup_id_seq')::text, 3, '0')),
    "submittedApplianceID" VARCHAR(20) NOT NULL,
    "addressID" VARCHAR(20),
    "pickupDate" DATE,
    "pickupTimeSlot" VARCHAR(50),
    "snapshotReceiverName" VARCHAR(255),
    "snapshotPhoneNum" VARCHAR(50),
    "snapshotAddress" TEXT,
    "snapshotCity" VARCHAR(100),
    "snapshotState" VARCHAR(100),
    "snapshotZipCode" VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("submittedApplianceID") REFERENCES "SubmittedAppliance"("submittedApplianceID") ON DELETE CASCADE,
    FOREIGN KEY ("addressID") REFERENCES "PickupAddress"("addressID") ON DELETE SET NULL
);

CREATE INDEX idx_pickup_submittedApplianceID ON "Pickup"("submittedApplianceID");

-- =====================================================
-- STEP 26: Create SummaryReport table
-- =====================================================

CREATE TABLE "SummaryReport" (
    "summaryReportID" VARCHAR(20) PRIMARY KEY DEFAULT ('SUM' || LPAD(nextval('summary_report_id_seq')::text, 3, '0')),
    "adminID" VARCHAR(20) NOT NULL,
    "startDateRange" DATE,
    "endDateRange" DATE,
    format VARCHAR(50),
    "generatedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("adminID") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX idx_summary_report_adminID ON "SummaryReport"("adminID");

-- =====================================================
-- STEP 27: Create BuyerAppliance table
-- =====================================================

CREATE TABLE "BuyerAppliance" (
    "buyerID" VARCHAR(20) NOT NULL,
    "applianceID" VARCHAR(20) NOT NULL,
    "basePrice" DECIMAL(10,2),
    PRIMARY KEY ("buyerID", "applianceID"),
    FOREIGN KEY ("buyerID") REFERENCES users("userID") ON DELETE CASCADE,
    FOREIGN KEY ("applianceID") REFERENCES "Appliance"("applianceID") ON DELETE CASCADE
);

-- =====================================================
-- STEP 28: Create BuyerMarkdown table
-- =====================================================

CREATE TABLE "BuyerMarkdown" (
    "buyerID" VARCHAR(20) NOT NULL,
    "conditionID" VARCHAR(20) NOT NULL,
    "markdownPercentage" DECIMAL(5,2),
    PRIMARY KEY ("buyerID", "conditionID"),
    FOREIGN KEY ("buyerID") REFERENCES users("userID") ON DELETE CASCADE,
    FOREIGN KEY ("conditionID") REFERENCES "ConditionOption"("conditionID") ON DELETE CASCADE
);

-- =====================================================
-- STEP 29: Add foreign key constraints
-- =====================================================

ALTER TABLE "TransactionReport"
    ADD CONSTRAINT fk_transaction_report_transactionID
    FOREIGN KEY ("transactionID") REFERENCES "Transaction"("transactionID") ON DELETE SET NULL;

ALTER TABLE "SubmittedAppliance"
    ADD CONSTRAINT fk_submitted_appliance_scoreID
    FOREIGN KEY ("scoreID") REFERENCES "Score"("scoreID") ON DELETE SET NULL;

-- =====================================================
-- STEP 30: Insert default superadmin
-- =====================================================

INSERT INTO users (
    "userID",
    username,
    password,
    name,
    user_type,
    user_status,
    admin_role,
    admin_id,
    can_change_password,
    email_verified
) VALUES (
    'U001',
    'superadmin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lW.8w4x0GQHS',
    'Super Administrator',
    'superadmin',
    'ACTIVE',
    'SUPERADMIN',
    'A001',
    true,
    true
);

SELECT setval('user_id_seq', 1);

-- =====================================================
-- STEP 31: Create update triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_updated_at BEFORE UPDATE ON "Transaction"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 32: Verify structure
-- =====================================================

SELECT '=== DATABASE CREATED SUCCESSFULLY ===' as info;

SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

COMMIT;

-- Default login: username=superadmin, password=admin123
