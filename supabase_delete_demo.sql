-- ============================================
-- Delete all demo transaction data
-- Run this to clean up before inserting new data
-- ============================================

-- Delete in correct order to avoid foreign key constraint violations

-- 1. Delete ItemStatus first (depends on Transaction)
DELETE FROM "ItemStatus" WHERE "transactionID" IN (
  SELECT "transactionID" FROM "Transaction" WHERE "sellerID" = 'S001'
);

-- 2. Delete Transaction (depends on SubmittedAppliance)
DELETE FROM "Transaction" WHERE "sellerID" = 'S001';

-- 3. Delete SubmittedAppliance
DELETE FROM "SubmittedAppliance" WHERE "sellerID" = 'S001';

-- 4. Reset sequences (if they exist) - uncomment if you have sequences
-- ALTER SEQUENCE submitted_appliance_id_seq RESTART WITH 1;
-- ALTER SEQUENCE transaction_id_seq RESTART WITH 1;
-- ALTER SEQUENCE item_status_id_seq RESTART WITH 1;

-- Verify deletion
SELECT
  (SELECT COUNT(*) FROM "SubmittedAppliance" WHERE "sellerID" = 'S001') as submitted_appliances,
  (SELECT COUNT(*) FROM "Transaction" WHERE "sellerID" = 'S001') as transactions,
  (SELECT COUNT(*) FROM "ItemStatus") as item_status;
