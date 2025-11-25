import { Request, Response } from 'express';
import pool from '../config/database';

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
        sa."initialPhysicalCondition",
        sa."finalFunctionalStatus",
        sa."finalPhysicalCondition",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa.note,
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
        sa."initialPhysicalCondition",
        sa."finalFunctionalStatus",
        sa."finalPhysicalCondition",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa.note,
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
        COALESCE(sa."initialPhysicalCondition", 'N/A') as "initialPhysicalCondition",
        sa."finalFunctionalStatus",
        sa."finalPhysicalCondition",
        COALESCE(sa."initialOfferPrice", 0) as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        COALESCE(sa.note, '') as note,
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

    // Fetch selected conditions/issues for this submission
    const conditionsResult = await pool.query(
      `SELECT co.description, co.code, cg."criteriaName"
       FROM "ConditionSelected" cs
       JOIN "ConditionOption" co ON cs."conditionID" = co."conditionID"
       LEFT JOIN "ConditionGroup" cg ON co."groupID" = cg."groupID"
       WHERE cs."submittedApplianceID" = $1 AND cs."isChecked" = true`,
      [transaction.submittedApplianceID]
    );

    // Add selected issues to the response (for backward compatibility)
    transaction.selectedIssues = conditionsResult.rows.map(row => row.description || row.code);

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
        sa.note,
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
 * Update submission details (seller edit when Awaiting Pick Up)
 * Allows editing appliance info, dynamic conditions, photos, and pickup snapshot address
 */
export const updateSubmissionDetails = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      categoryId,
      brandId,
      modelId,
      note,
      questionAnswers, // Array of dynamic condition answers
      snapshotReceiverName,
      snapshotPhoneNum,
      snapshotAddress,
      snapshotCity,
      snapshotState,
      snapshotZipCode,
      pickupDate,
      pickupTimeSlot
    } = req.body;

    console.log('📝 Updating submission details for transaction:', id);
    console.log('Request body:', req.body);

    // Get transaction and verify status
    const txnResult = await client.query(
      `SELECT t."submittedApplianceID", i."itemStatus"
       FROM "Transaction" t
       LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
       WHERE t."transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const { submittedApplianceID, itemStatus } = txnResult.rows[0];

    // Only allow editing when Awaiting Pick Up
    if (itemStatus !== 'Awaiting Pick Up') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot edit submission. Current status: ${itemStatus}. Editing is only allowed when status is "Awaiting Pick Up".`
      });
    }

    // Update SubmittedAppliance table
    if (modelId || note !== undefined) {
      await client.query(
        `UPDATE "SubmittedAppliance"
         SET "applianceID" = COALESCE($1, "applianceID"),
             note = COALESCE($2, note)
         WHERE "submittedApplianceID" = $3`,
        [modelId, note, submittedApplianceID]
      );
      console.log('✅ Updated SubmittedAppliance');
    }

    // Update dynamic condition selections if provided
    if (questionAnswers && Array.isArray(questionAnswers)) {
      // Delete existing condition selections
      await client.query(
        `DELETE FROM "ConditionSelected" WHERE "submittedApplianceID" = $1`,
        [submittedApplianceID]
      );
      console.log('🗑️ Deleted old condition selections');

      // Insert new selections
      for (const qa of questionAnswers) {
        if ((qa.type === 'radio' || qa.type === 'image') && qa.answer) {
          await client.query(
            `INSERT INTO "ConditionSelected" ("conditionID", "submittedApplianceID", "isChecked", "created_at")
             VALUES ($1, $2, true, NOW())`,
            [qa.answer, submittedApplianceID]
          );
        }
        if (qa.type === 'checkbox' && Array.isArray(qa.answer)) {
          for (const conditionID of qa.answer) {
            await client.query(
              `INSERT INTO "ConditionSelected" ("conditionID", "submittedApplianceID", "isChecked", "created_at")
               VALUES ($1, $2, true, NOW())`,
              [conditionID, submittedApplianceID]
            );
          }
        }
      }
      console.log('✅ Inserted new condition selections');
    }

    // Update Pickup snapshot address and pickup date/time if any field is provided
    if (snapshotReceiverName || snapshotPhoneNum || snapshotAddress ||
        snapshotCity || snapshotState || snapshotZipCode || pickupDate || pickupTimeSlot) {
      await client.query(
        `UPDATE "Pickup"
         SET "snapshotReceiverName" = COALESCE($1, "snapshotReceiverName"),
             "snapshotPhoneNum" = COALESCE($2, "snapshotPhoneNum"),
             "snapshotAddress" = COALESCE($3, "snapshotAddress"),
             "snapshotCity" = COALESCE($4, "snapshotCity"),
             "snapshotState" = COALESCE($5, "snapshotState"),
             "snapshotZipCode" = COALESCE($6, "snapshotZipCode"),
             "pickupDate" = COALESCE($7, "pickupDate"),
             "pickupTimeSlot" = COALESCE($8, "pickupTimeSlot")
         WHERE "submittedApplianceID" = $9`,
        [snapshotReceiverName, snapshotPhoneNum, snapshotAddress,
         snapshotCity, snapshotState, snapshotZipCode, pickupDate, pickupTimeSlot, submittedApplianceID]
      );
      console.log('✅ Updated Pickup snapshot address and date/time');
    }

    await client.query('COMMIT');
    console.log('✅ Submission details updated successfully');

    res.json({
      message: 'Submission details updated successfully',
      submittedApplianceID
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating submission details:', error);
    res.status(500).json({
      message: 'Failed to update submission details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

/**
 * Update transaction with full data (admin edit)
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
      initialFunctionalStatus,
      initialPhysicalCondition,
      note
    } = req.body;

    console.log('📝 Updating transaction with full data:', { id, ...req.body });

    // Get the submittedApplianceID for this transaction
    const txnResult = await pool.query(
      `SELECT "submittedApplianceID" FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const submittedApplianceID = txnResult.rows[0].submittedApplianceID;

    // Update SubmittedAppliance table
    await pool.query(
      `UPDATE "SubmittedAppliance"
       SET "initialFunctionalStatus" = COALESCE($1, "initialFunctionalStatus"),
           "initialPhysicalCondition" = COALESCE($2, "initialPhysicalCondition"),
           "finalOfferPrice" = COALESCE($3, "finalOfferPrice"),
           note = COALESCE($4, note)
       WHERE "submittedApplianceID" = $5`,
      [initialFunctionalStatus, initialPhysicalCondition, finalPrice, note, submittedApplianceID]
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

    console.log('✅ Transaction updated successfully');

    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({ message: 'Failed to update transaction', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};


