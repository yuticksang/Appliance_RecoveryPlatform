-- ============================================
-- SUPABASE SQL - Demo Data for S001
-- Paste this into Supabase SQL Editor
-- ============================================

-- Transaction 1: Under Review + Awaiting Pick Up
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA001', 'S001', 'APL001', 'PA002', NULL,
    '2025-11-09 10:30:00', 'Working', 'Good',
    NULL, NULL, 'LG 9kg Washer - Admin reviewing status'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN001', 'SA001', 'S001', 'Under Review', '2025-11-09 10:30:00', '2025-11-09 10:30:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN001', 'Awaiting Pick Up', '2025-11-09 10:30:00');

-- Transaction 2: Awaiting Confirmation + Awaiting Pick Up
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA002', 'S001', 'APL002', 'PA002', NULL,
    '2025-11-08 14:20:00', 'Working', 'Excellent',
    600.00, NULL, 'Samsung Washer Dryer - Waiting for confirmation'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN002', 'SA002', 'S001', 'Awaiting Confirmation', '2025-11-08 14:20:00', '2025-11-08 16:45:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN002', 'Awaiting Pick Up', '2025-11-08 16:45:00');

-- Transaction 3: Confirmed + Awaiting Pick Up
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA003', 'S001', 'APL003', 'PA002', NULL,
    '2025-11-07 09:15:00', 'Working', 'Fair',
    150.00, 150.00, 'Panasonic Microwave - Seller accepted offer'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN003', 'SA003', 'S001', 'Confirmed', '2025-11-07 09:15:00', '2025-11-07 11:30:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN003', 'Awaiting Pick Up', '2025-11-07 11:30:00');

-- Transaction 4: Pending Payment + Picked Up
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA004', 'S001', 'APL004', 'PA002', NULL,
    '2025-11-05 11:45:00', 'Working', 'Good',
    550.00, 550.00, 'Mitsubishi Aircon - Item picked up, payment processing'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt", "paymentDueDate")
VALUES ('TXN004', 'SA004', 'S001', 'Pending Payment', '2025-11-05 11:45:00', '2025-11-06 14:20:00', '2025-11-13 14:20:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN004', 'Picked Up', '2025-11-06 14:20:00');

-- Transaction 5: Completed + Picked Up
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA005', 'S001', 'APL006', 'PA002', NULL,
    '2025-10-28 10:00:00', 'Working', 'Good',
    420.00, 420.00, 'Daikin Aircon - Payment successfully made'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN005', 'SA005', 'S001', 'Completed', '2025-10-28 10:00:00', '2025-10-30 15:30:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN005', 'Picked Up', '2025-10-30 15:30:00');

-- Transaction 6: Rejected + Returned
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA006', 'S001', 'APL007', 'PA002', NULL,
    '2025-10-25 13:30:00', 'Not Working', 'Poor',
    0.00, NULL, 'Dyson Vacuum - Seller rejected offer'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt", "rejectionReason")
VALUES ('TXN006', 'SA006', 'S001', 'Rejected', '2025-10-25 13:30:00', '2025-10-26 10:00:00', 'Seller rejected the offer');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN006', 'Returned', '2025-10-26 10:00:00');

-- Transaction 7: Cancelled + Unresponded
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA007', 'S001', 'APL008', 'PA002', NULL,
    '2025-10-20 08:45:00', 'Working', 'Good',
    380.00, NULL, 'Bosch Oven - No seller response after 14 days'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN007', 'SA007', 'S001', 'Cancelled', '2025-10-20 08:45:00', '2025-11-03 09:00:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN007', 'Unresponded', '2025-11-03 09:00:00');

-- Transaction 8: Cancelled + Awaiting Pick Up
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA008', 'S001', 'APL009', 'PA002', NULL,
    '2025-10-18 15:20:00', 'Working', 'Good',
    280.00, NULL, 'Xiaomi Robot Vacuum - No response on pickup'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN008', 'SA008', 'S001', 'Cancelled', '2025-10-18 15:20:00', '2025-10-28 11:00:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN008', 'Awaiting Pick Up', '2025-10-28 11:00:00');

-- Transaction 9: Rejected + Awaiting Return
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA009', 'S001', 'APL010', 'PA002', NULL,
    '2025-10-15 11:00:00', 'Working', 'Good',
    320.00, NULL, 'Electrolux Gas Hob - Item picked up but seller rejected'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt", "rejectionReason")
VALUES ('TXN009', 'SA009', 'S001', 'Rejected', '2025-10-15 11:00:00', '2025-10-17 14:30:00', 'Seller rejected after pickup');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN009', 'Awaiting Return', '2025-10-17 14:30:00');

-- Transaction 10: Completed + Picked Up (Another)
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA010', 'S001', 'APL011', 'PA002', NULL,
    '2025-10-10 09:30:00', 'Working', 'Excellent',
    650.00, 650.00, 'Samsung Refrigerator - Transaction completed'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN010', 'SA010', 'S001', 'Completed', '2025-10-10 09:30:00', '2025-10-14 16:00:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN010', 'Picked Up', '2025-10-14 16:00:00');

-- Transaction 11: Under Review + Awaiting Pick Up (Another)
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA011', 'S001', 'APL012', 'PA002', NULL,
    '2025-11-06 16:45:00', 'Working', 'Good',
    NULL, NULL, 'Sharp Refrigerator - Submitted for review'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN011', 'SA011', 'S001', 'Under Review', '2025-11-06 16:45:00', '2025-11-06 16:45:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN011', 'Awaiting Pick Up', '2025-11-06 16:45:00');

-- Transaction 12: Awaiting Confirmation + Awaiting Pick Up (Another)
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA012', 'S001', 'APL013', 'PA002', NULL,
    '2025-11-03 10:15:00', 'Working', 'Good',
    180.00, NULL, 'Philips Airfryer - Waiting for confirmation'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN012', 'SA012', 'S001', 'Awaiting Confirmation', '2025-11-03 10:15:00', '2025-11-04 09:30:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN012', 'Awaiting Pick Up', '2025-11-04 09:30:00');

-- Transaction 13: Confirmed + Picked Up
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA013', 'S001', 'APL014', 'PA002', NULL,
    '2025-10-01 11:20:00', 'Working', 'Fair',
    380.00, 380.00, 'Whirlpool Washer - Confirmed and picked up'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN013', 'SA013', 'S001', 'Confirmed', '2025-10-01 11:20:00', '2025-10-03 14:00:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN013', 'Picked Up', '2025-10-03 14:00:00');

-- Transaction 14: Pending Payment + Picked Up (Another)
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA014', 'S001', 'APL015', 'PA002', NULL,
    '2025-09-28 14:30:00', 'Working', 'Good',
    95.00, 95.00, 'Tefal Blender - Payment processing'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt", "paymentDueDate")
VALUES ('TXN014', 'SA014', 'S001', 'Pending Payment', '2025-09-28 14:30:00', '2025-09-29 10:15:00', '2025-10-06 10:15:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN014', 'Picked Up', '2025-09-29 10:15:00');

-- Transaction 15: Completed + Picked Up (Another)
INSERT INTO "SubmittedAppliance" (
    "submittedApplianceID", "sellerID", "applianceID", "addressID", "scoreID",
    "submissionDate", "initialFunctionalStatus", "initialPhysicalCondition",
    "initialOfferPrice", "finalOfferPrice", note
)
VALUES (
    'SA015', 'S001', 'APL012', 'PA002', NULL,
    '2025-09-20 13:15:00', 'Working', 'Excellent',
    490.00, 490.00, 'Electrolux Washer - Payment transferred'
);

INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
VALUES ('TXN015', 'SA015', 'S001', 'Completed', '2025-09-20 13:15:00', '2025-09-24 11:30:00');

INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
VALUES ('TXN015', 'Picked Up', '2025-09-24 11:30:00');

-- Verify the data
SELECT
    t."transactionStatus",
    i."itemStatus",
    COUNT(*) as count
FROM "Transaction" t
JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
WHERE t."sellerID" = 'S001'
GROUP BY t."transactionStatus", i."itemStatus"
ORDER BY t."transactionStatus", i."itemStatus";

-- Display all transactions
SELECT
    sa."submittedApplianceID",
    sa.note,
    t."transactionStatus",
    i."itemStatus",
    sa."initialOfferPrice",
    sa."finalOfferPrice",
    DATE(sa."submissionDate") as submitted_date
FROM "SubmittedAppliance" sa
JOIN "Transaction" t ON sa."submittedApplianceID" = t."submittedApplianceID"
JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
WHERE sa."sellerID" = 'S001'
ORDER BY sa."submissionDate" DESC;

-- ============================================
-- ✅ DONE! 15 transactions created for S001
-- ============================================
-- Status Coverage:
-- - Under Review (2)
-- - Awaiting Confirmation (2)
-- - Confirmed (2)
-- - Pending Payment (2)
-- - Completed (3)
-- - Rejected (2)
-- - Cancelled (2)
--
-- Item Status: Awaiting Pick Up, Picked Up,
--              Returned, Unresponded, Awaiting Return
-- ============================================
