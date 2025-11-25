import { Request, Response } from 'express';
import pool from '../config/database';

console.log('🔥🔥🔥 transactionController.ts LOADED - VERSION 2 WITH CONDITION FIX 🔥🔥🔥');

/**
 * Get all transactions for a specific seller
 * Joins SubmittedAppliance, Transaction, ItemStatus, and Appliance tables
 */
export const getTransactionsBySeller = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;

    console.log('📦 Fetching transactions for seller ID:', sellerId);

    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        u.name as "sellerName",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        sa."initialFunctionalStatus",
        sa."initialAppearanceStatus",
        sa."finalFunctionalStatus",
        sa."finalAppearanceStatus",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa."initialNote",
        sa."finalNote",
        t."transactionStatus",
        t."createdAt",
        t."updatedAt",
        t."paymentDueDate",
        t."rejectionReason",
        i."itemStatus",
        i."updatedAt" as "itemStatusUpdatedAt",
        b."brandName" as brand,
        c."categoryName" as category,
        a."modelCode" as model,
        a."modelName" as "modelName",
        a.image_url as "imageUrl"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      INNER JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a."applianceID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      WHERE t."sellerID" = $1
      ORDER BY sa."submissionDate" DESC`,
      [sellerId]
    );

    console.log(`✅ Found ${result.rows.length} transactions for seller ${sellerId}`);

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching transactions by seller:', error);
    res.status(500).json({ message: 'Failed to fetch transactions', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Get all transactions (admin view)
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    console.log('📦 Fetching all transactions');

    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        u.name as "sellerName",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        sa."initialFunctionalStatus",
        sa."initialAppearanceStatus",
        sa."finalFunctionalStatus",
        sa."finalAppearanceStatus",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa."initialNote",
        sa."finalNote",
        t."transactionStatus",
        t."createdAt",
        t."updatedAt",
        t."paymentDueDate",
        t."rejectionReason",
        i."itemStatus",
        i."updatedAt" as "itemStatusUpdatedAt",
        b."brandName" as brand,
        c."categoryName" as category,
        a."modelCode" as model,
        a."modelName" as "modelName",
        a.image_url as "imageUrl"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      INNER JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a."applianceID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      ORDER BY sa."submissionDate" DESC`
    );

    console.log(`✅ Found ${result.rows.length} total transactions`);

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching all transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Get a single transaction by ID
 */
export const getTransactionById = async (req: Request, res: Response) => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀🚀🚀 getTransactionById CALLED AT:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    const { id } = req.params;

    console.log('📦 Fetching transaction ID:', id);

    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        COALESCE(u.name, 'Unknown') as "sellerName",
        COALESCE(u.email, '') as "sellerEmail",
        COALESCE(u.phone, '') as "sellerPhone",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        COALESCE(sa."initialFunctionalStatus", 'N/A') as "initialFunctionalStatus",
        COALESCE(sa."initialAppearanceStatus", 'N/A') as "initialAppearanceStatus",
        sa."finalFunctionalStatus",
        sa."finalAppearanceStatus",
        COALESCE(sa."initialOfferPrice", 0) as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        COALESCE(sa."initialNote", '') as "initialNote",
        COALESCE(sa."finalNote", '') as "finalNote",
        t."transactionStatus",
        t."createdAt",
        t."updatedAt",
        t."paymentDueDate",
        t."rejectionReason",
        COALESCE(i."itemStatus", 'Awaiting Pick Up') as "itemStatus",
        i."updatedAt" as "itemStatusUpdatedAt",
        COALESCE(b."brandName", 'Unknown') as brand,
        b."brandID" as "brandId",
        COALESCE(c."categoryName", 'Unknown') as category,
        c."categoryID" as "categoryId",
        COALESCE(a."modelCode", 'N/A') as model,
        a."applianceID" as "modelId",
        COALESCE(a."modelName", 'N/A') as "modelName",
        COALESCE(a.image_url, '') as "imageUrl",
        p."addressID" as "addressId",
        COALESCE(p."snapshotReceiverName", 'N/A') as "addressName",
        COALESCE(p."snapshotPhoneNum", 'N/A') as "addressPhone",
        COALESCE(p."snapshotState", 'N/A') as state,
        COALESCE(p."snapshotCity", 'N/A') as city,
        COALESCE(p."snapshotZipCode", 'N/A') as "zipCode",
        COALESCE(p."snapshotAddress", 'N/A') as "pickupAddress",
        TO_CHAR(p."pickupDate", 'YYYY-MM-DD') as "pickupDate",
        p."pickupTimeSlot"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      LEFT JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a."applianceID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      LEFT JOIN "Pickup" p ON sa."submittedApplianceID" = p."submittedApplianceID"
      WHERE t."transactionID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Transaction not found: ${id}`);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    // Fetch selected conditions/issues for this submission, grouped by criteriaName and selectedBy
    const conditionsResult = await pool.query(
      `SELECT co.description, co.code, co."conditionID", cg."criteriaName", cg."groupID", cg.status as "groupStatus",
              cg.question_type, cs."textValue",
              COALESCE(cs."selectedBy", 'seller') as "selectedBy"
       FROM "ConditionSelected" cs
       LEFT JOIN "ConditionOption" co ON cs."conditionID" = co."conditionID"
       LEFT JOIN "ConditionGroup" cg ON co."groupID" = cg."groupID" OR cs."conditionID" = cg."groupID"
       WHERE cs."submittedApplianceID" = $1 AND cs."isChecked" = true
       ORDER BY cg."display_order", cs."selectedAt"`,
      [transaction.submittedApplianceID]
    );

    console.log('📋 Raw conditions from DB:', conditionsResult.rows);

    // Fetch all condition groups to identify textarea and file_upload types
    const conditionGroupsResult = await pool.query(
      `SELECT "groupID", "criteriaName", question_type FROM "ConditionGroup"`
    );

    console.log('📋 Condition groups:', conditionGroupsResult.rows);

    // Group conditions by groupID and selectedBy (seller vs admin)
    // Using groupID instead of criteriaName for better mapping
    const sellerConditions: { [key: string]: string | string[] } = {};
    const adminConditions: { [key: string]: string | string[] } = {};

    conditionsResult.rows.forEach(row => {
      console.log(`📋 Processing condition: ${row.description || row.textValue}, Group: ${row.criteriaName} (${row.groupID}), Type: ${row.question_type}, SelectedBy: ${row.selectedBy}`);

      const groupID = row.groupID;
      const questionType = row.question_type;

      // Handle different question types
      let value: string | string[];

      if (questionType === 'textarea') {
        // For textarea, use textValue (free-form text)
        value = row.textValue || '';
        console.log(`📝 Textarea value for ${groupID}:`, value);
      } else if (questionType === 'file_upload') {
        // For file_upload, parse JSON array from textValue
        try {
          value = row.textValue ? JSON.parse(row.textValue) : [];
          console.log(`📸 File upload value for ${groupID}:`, value);
        } catch (e) {
          console.error(`❌ Error parsing file_upload JSON for ${groupID}:`, e);
          value = [];
        }
      } else {
        // For regular conditions (radio, checkbox, dropdown, image), use description
        value = row.description || row.code;
      }

      // Group by selectedBy (seller vs admin)
      if (row.selectedBy === 'admin') {
        if (questionType === 'checkbox') {
          // Checkbox: accumulate multiple values in array
          if (!adminConditions[groupID]) {
            adminConditions[groupID] = [];
          }
          (adminConditions[groupID] as string[]).push(value as string);
        } else if (questionType === 'textarea' || questionType === 'file_upload') {
          // Textarea and file_upload: set value directly (already string or array)
          adminConditions[groupID] = value;
        } else {
          // Radio, dropdown, image: single string value
          adminConditions[groupID] = value;
        }
      } else {
        if (questionType === 'checkbox') {
          // Checkbox: accumulate multiple values in array
          if (!sellerConditions[groupID]) {
            sellerConditions[groupID] = [];
          }
          (sellerConditions[groupID] as string[]).push(value as string);
        } else if (questionType === 'textarea' || questionType === 'file_upload') {
          // Textarea and file_upload: set value directly (already string or array)
          sellerConditions[groupID] = value;
        } else {
          // Radio, dropdown, image: single string value
          sellerConditions[groupID] = value;
        }
      }
    });

    console.log('📋 Seller conditions:', sellerConditions);
    console.log('📋 Admin conditions:', adminConditions);

    // Add both to response
    transaction.sellerConditions = sellerConditions;  // Before (what seller filled)
    transaction.adminConditions = adminConditions;    // After (what admin reviewed)

    // Keep conditionGroups for backward compatibility (show seller's original by default)
    transaction.conditionGroups = sellerConditions;

    // Keep selectedIssues for backward compatibility (flatten all seller conditions)
    transaction.selectedIssues = conditionsResult.rows
      .filter(row => row.selectedBy !== 'admin')
      .map(row => row.description || row.code);

    // NEW: Fetch DYNAMIC question-answer pairs
    const questionAnswersResult = await pool.query(
      `SELECT
        cg."groupID",
        cg."criteriaName" as "sectionName",
        cg."question_title" as question,
        cg."question_type" as type,
        json_agg(
          json_build_object(
            'id', co."conditionID",
            'description', co.description
          )
        ) as "selectedOptions"
       FROM "ConditionSelected" cs
       JOIN "ConditionOption" co ON cs."conditionID" = co."conditionID"
       JOIN "ConditionGroup" cg ON co."groupID" = cg."groupID"
       WHERE cs."submittedApplianceID" = $1 AND cs."isChecked" = true
       GROUP BY cg."groupID", cg."criteriaName", cg."question_title", cg."question_type"
       ORDER BY cg."display_order" ASC`,
      [transaction.submittedApplianceID]
    );

    // Format dynamic answers for frontend
    transaction.dynamicAnswers = questionAnswersResult.rows.map(row => ({
      groupID: row.groupID,
      sectionName: row.sectionName,
      question: row.question,
      type: row.type,
      // For checkbox: return array of descriptions
      // For radio/image: return single description string
      answer: row.type === 'checkbox'
        ? row.selectedOptions.map((opt: any) => opt.description)
        : row.selectedOptions[0]?.description || 'N/A'
    }));

    // Fetch photos for this submission
    const photosResult = await pool.query(
      `SELECT "photoURL" FROM "Photo" WHERE "submittedApplianceID" = $1 ORDER BY "photoID"`,
      [transaction.submittedApplianceID]
    );

    // Add photos array to the response
    transaction.photos = photosResult.rows.map(row => row.photoURL);

    console.log(`✅ Found transaction ${id}:`, transaction);
    console.log(`📋 Selected issues:`, transaction.selectedIssues);
    console.log(`📷 Photos:`, transaction.photos);

    // Disable caching to ensure fresh data is always returned
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json(transaction);
  } catch (error) {
    console.error('❌ Error fetching transaction by ID:', error);
    console.error('Full error:', error);
    res.status(500).json({ message: 'Failed to fetch transaction', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Create a new transaction
 */
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { submittedApplianceID, sellerID } = req.body;

    console.log('📝 Creating new transaction:', { submittedApplianceID, sellerID });

    // Insert into Transaction table
    const transactionResult = await pool.query(
      `INSERT INTO "Transaction" ("transactionID", "submittedApplianceID", "sellerID", "transactionStatus", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Under Review', NOW(), NOW())
       RETURNING *`,
      [`TXN-${Date.now()}`, submittedApplianceID, sellerID]
    );

    const transaction = transactionResult.rows[0];

    // Insert into ItemStatus table
    await pool.query(
      `INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
       VALUES ($1, 'Awaiting Pick Up', NOW())`,
      [transaction.transactionID]
    );

    console.log('✅ Transaction created:', transaction.transactionID);

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    res.status(500).json({ message: 'Failed to create transaction', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionStatus, itemStatus } = req.body;

    console.log('📝 Updating transaction:', { id, transactionStatus, itemStatus });

    // Update transaction status with automatic deadline setting
    if (transactionStatus) {
      console.log('🔄 Updating transaction status to:', transactionStatus);

      // Determine which deadlines to set based on status
      let updateQuery = '';
      let queryParams: any[] = [];

      if (transactionStatus === 'Awaiting Confirmation') {
        // Set responseDeadline to 14 days from now
        updateQuery = `UPDATE "Transaction"
         SET "transactionStatus" = $1, "updatedAt" = NOW(), "responseDeadline" = NOW() + INTERVAL '14 days'
         WHERE "transactionID" = $2
         RETURNING *`;
        queryParams = [transactionStatus, id];
        console.log('📅 Setting responseDeadline to 14 days from now');
      } else if (transactionStatus === 'Pending Payment') {
        // Set paymentDueDate to 14 days from now
        updateQuery = `UPDATE "Transaction"
         SET "transactionStatus" = $1, "updatedAt" = NOW(), "paymentDueDate" = NOW() + INTERVAL '14 days'
         WHERE "transactionID" = $2
         RETURNING *`;
        queryParams = [transactionStatus, id];
        console.log('📅 Setting paymentDueDate to 14 days from now');
      } else {
        // For other statuses, just update the status
        updateQuery = `UPDATE "Transaction"
         SET "transactionStatus" = $1, "updatedAt" = NOW()
         WHERE "transactionID" = $2
         RETURNING *`;
        queryParams = [transactionStatus, id];
      }

      const txnResult = await pool.query(updateQuery, queryParams);
      console.log('✅ Transaction status updated, rows affected:', txnResult.rowCount);

      if (txnResult.rowCount === 0) {
        console.error('❌ No transaction found with ID:', id);
        return res.status(404).json({ message: 'Transaction not found' });
      }
    }

    // Update item status (try update first, then insert if needed)
    if (itemStatus) {
      console.log('🔄 Updating item status to:', itemStatus);

      // Try to update first
      const updateResult = await pool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = $1, "updatedAt" = NOW()
         WHERE "transactionID" = $2
         RETURNING *`,
        [itemStatus, id]
      );

      // If no rows were updated, insert a new record
      if (updateResult.rowCount === 0) {
        console.log('⚠️ No ItemStatus found, creating new record...');
        await pool.query(
          `INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
           VALUES ($1, $2, NOW())`,
          [id, itemStatus]
        );
        console.log('✅ Item status created');
      } else {
        console.log('✅ Item status updated, rows affected:', updateResult.rowCount);
      }
    }

    // Fetch updated transaction
    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        u.name as "sellerName",
        sa."submissionDate" as "submittedDate",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa."initialNote",
        sa."finalNote",
        t."transactionStatus",
        t."updatedAt",
        i."itemStatus",
        b."brandName" as brand,
        c."categoryName" as category,
        a."modelCode" as model,
        a."modelName" as "modelName"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      LEFT JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a."applianceID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      WHERE t."transactionID" = $1`,
      [id]
    );

    console.log('✅ Transaction status updated');

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating transaction status:', error);
    res.status(500).json({ message: 'Failed to update transaction status', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Update transaction with full data (admin edit)
 * Now supports dynamic condition selections stored in ConditionSelected table
 */
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      transactionStatus,
      itemStatus,
      finalPrice,
      brand,
      model,
      category,
      modelName,
      finalFunctionalStatus,
      finalAppearanceStatus,
      finalNote,
      // Admin's checklist selections
      adminConditions,
      // Photo uploads from admin (base64 data URLs with remark)
      photos
    } = req.body;

    console.log('📝 Updating transaction with full data:', { id, transactionStatus, itemStatus, finalPrice, finalNote, hasPhotos: !!photos, photoCount: photos?.length });

    // Get the submittedApplianceID for this transaction
    const txnResult = await pool.query(
      `SELECT "submittedApplianceID" FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const submittedApplianceID = txnResult.rows[0].submittedApplianceID;

    // Update SubmittedAppliance table with admin's review data
    await pool.query(
      `UPDATE "SubmittedAppliance"
       SET "finalOfferPrice" = COALESCE($1, "finalOfferPrice"),
           "finalFunctionalStatus" = COALESCE($2, "finalFunctionalStatus"),
           "finalAppearanceStatus" = COALESCE($3, "finalAppearanceStatus"),
           "finalNote" = COALESCE($4, "finalNote")
       WHERE "submittedApplianceID" = $5`,
      [finalPrice, finalFunctionalStatus, finalAppearanceStatus, finalNote, submittedApplianceID]
    );

    // Update Transaction status if provided
    if (transactionStatus) {
      await pool.query(
        `UPDATE "Transaction"
         SET "transactionStatus" = $1, "updatedAt" = NOW()
         WHERE "transactionID" = $2`,
        [transactionStatus, id]
      );
    }

    // Update ItemStatus if provided
    if (itemStatus) {
      const updateResult = await pool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = $1, "updatedAt" = NOW()
         WHERE "transactionID" = $2
         RETURNING *`,
        [itemStatus, id]
      );

      if (updateResult.rowCount === 0) {
        await pool.query(
          `INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
           VALUES ($1, $2, NOW())`,
          [id, itemStatus]
        );
      }
    }

    // ─────────────────────────────────────────────────────────
    // SAVE ADMIN CHECKLIST SELECTIONS TO ConditionSelected
    // selectedBy = 'admin' for admin review
    // Only checkbox (checklist) items are stored here
    // Functional Status, Appearance Status, and Notes are in SubmittedAppliance
    // ─────────────────────────────────────────────────────────
    if (adminConditions && typeof adminConditions === 'object' && Object.keys(adminConditions).length > 0) {
      console.log('📋 Saving admin checklist selections:', adminConditions);

      try {
        // First, delete ALL existing admin checklist selections for this submission
        await pool.query(
          `DELETE FROM "ConditionSelected"
           WHERE "submittedApplianceID" = $1 AND "selectedBy" = 'admin'`,
          [submittedApplianceID]
        );

        console.log('✅ Deleted existing admin checklist selections');

        // Insert checklist items (checkbox type only)
        for (const [groupID, value] of Object.entries(adminConditions)) {
          console.log(`📋 Processing checklist group ${groupID} with value:`, value);

          if (!value) {
            console.log(`⚠️ Skipping empty value for group ${groupID}`);
            continue;
          }

          // Checkbox values are always arrays
          const conditionIDs = Array.isArray(value) ? value : [value];

          for (const conditionID of conditionIDs) {
            console.log(`📋 Processing conditionID: "${conditionID}"`);

            if (!conditionID || (typeof conditionID === 'string' && conditionID.trim() === '')) {
              console.log(`⚠️ Skipping empty conditionID for group ${groupID}`);
              continue;
            }

            // If conditionID is a description, find the actual conditionID
            let actualConditionID = conditionID;

            if (typeof conditionID !== 'string' || !conditionID.startsWith('CO')) {
              // It's a description, find the conditionID
              console.log(`🔍 Looking up conditionID for description "${conditionID}" in group ${groupID}`);

              const condResult = await pool.query(
                `SELECT "conditionID" FROM "ConditionOption"
                 WHERE "groupID" = $1 AND description = $2`,
                [groupID, conditionID]
              );

              if (condResult.rows.length > 0) {
                actualConditionID = condResult.rows[0].conditionID;
                console.log(`✅ Found conditionID: ${actualConditionID}`);
              } else {
                console.warn(`⚠️ Could not find conditionID for description: "${conditionID}" in group ${groupID}`);
                console.warn(`⚠️ Database query returned no results. Skipping this condition.`);
                continue;
              }
            }

            console.log(`💾 Inserting condition: ${actualConditionID} for submission ${submittedApplianceID}`);

            await pool.query(
              `INSERT INTO "ConditionSelected"
               ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt")
               VALUES ($1, $2, true, 'admin', NOW())`,
              [actualConditionID, submittedApplianceID]
            );

            console.log(`✅ Successfully inserted checklist item ${actualConditionID}`);
          }
        }

        console.log('✅ All admin checklist selections saved successfully');
      } catch (conditionError) {
        console.error('❌ Error saving admin conditions:', conditionError);
        console.error('❌ Error details:', {
          message: conditionError instanceof Error ? conditionError.message : 'Unknown error',
          stack: conditionError instanceof Error ? conditionError.stack : undefined,
          adminConditions
        });
        throw conditionError; // Re-throw to be caught by outer catch block
      }
    }

    // ─────────────────────────────────────────────────────────
    // SAVE ADMIN PHOTOS TO Photo TABLE
    // photos is an array of { photoURL: string, remark: string }
    // remark: description of the photo added by admin (e.g., "Scratches on back panel")
    // Only update if photos array is explicitly provided
    // ─────────────────────────────────────────────────────────
    if (photos && Array.isArray(photos) && photos.length > 0) {
      console.log('📷 Processing admin photos:', photos.length, 'photos');

      try {
        // Delete existing admin photos (with remark) for this submission
        // Keep seller photos (without remark or with different remark pattern)
        await pool.query(
          `DELETE FROM "Photo"
           WHERE "submittedApplianceID" = $1
           AND "remark" IS NOT NULL
           AND "remark" != ''`,
          [submittedApplianceID]
        );

        console.log('✅ Deleted existing admin photos');

        // Insert new admin photos with remarks
        for (const photo of photos) {
          if (photo && photo.photoURL && photo.photoURL.trim() !== '') {
            await pool.query(
              `INSERT INTO "Photo" ("submittedApplianceID", "photoURL", "remark", "uploadDate")
               VALUES ($1, $2, $3, NOW())`,
              [submittedApplianceID, photo.photoURL, photo.remark || '']
            );
          }
        }

        console.log('✅ Admin photos saved successfully');
      } catch (photoError) {
        console.error('❌ Error saving admin photos:', photoError);
        console.error('❌ Photo error details:', {
          message: photoError instanceof Error ? photoError.message : 'Unknown error',
          photosCount: photos.length
        });
        throw photoError;
      }
    } else {
      console.log('📷 No admin photos to update (photos not provided or empty array)');
    }

    console.log('✅ Transaction updated successfully');

    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({ message: 'Failed to update transaction', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};


