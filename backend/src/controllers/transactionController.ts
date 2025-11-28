import { Request, Response } from 'express';
import pool from '../config/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Get all transactions for a specific seller
 * Joins SubmittedAppliance, Transaction, ItemStatus, and Appliance tables
 */
export const getTransactionsBySeller = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const authUser = (req as any).user; // From JWT token

    // Authorization check: Sellers can only view their own transactions
    // Admins can view any seller's transactions
    if (authUser.userType === 'seller') {
      // For sellers, verify they're requesting their own transactions
      // Need to check if authUser.userId owns this seller_id
      const userCheckResult = await pool.query(
        `SELECT seller_id FROM users WHERE "userID" = $1 AND user_type = 'seller'`,
        [authUser.userId]
      );

      if (userCheckResult.rows.length === 0) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      const userSellerId = userCheckResult.rows[0].seller_id;

      if (userSellerId !== sellerId) {
        return res.status(403).json({ message: 'You can only view your own transactions' });
      }
    } else if (authUser.userType !== 'admin' && authUser.userType !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        u.name as "sellerName",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
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

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching transactions by seller:', error);
    res.status(500).json({ message: 'Failed to fetch transactions', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Get all transactions (admin view)
 */
export const getAllTransactions = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        u.name as "sellerName",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa."initialNote" as "initialNote",
        sa."finalNote" as "finalNote",
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

    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        COALESCE(u.name, 'Unknown') as "sellerName",
        COALESCE(u.email, '') as "sellerEmail",
        COALESCE(u.phone, '') as "sellerPhone",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        COALESCE(sa."initialOfferPrice", 0) as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
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
       LEFT JOIN "ConditionGroup" cg ON COALESCE(co."groupID", cs."groupID") = cg."groupID"
       WHERE cs."submittedApplianceID" = $1 AND cs."isChecked" = true
       ORDER BY cg."display_order", cs."selectedAt"`,
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

    // Fetch photos for this submission
    const photosResult = await pool.query(
      `SELECT "photoURL", "remark", "uploadDate" FROM "Photo"
       WHERE "submittedApplianceID" = $1
       ORDER BY "uploadDate", "photoID"`,
      [transaction.submittedApplianceID]
    );

    // Separate photos by who uploaded them (seller vs admin)
    const sellerPhotos = photosResult.rows
      .filter(row => !row.remark || row.remark !== 'admin')
      .map(row => row.photoURL);

    const adminPhotos = photosResult.rows
      .filter(row => row.remark === 'admin')
      .map(row => row.photoURL);

    // Add photos arrays to the response
    transaction.photos = sellerPhotos; // Backward compatibility
    transaction.sellerPhotos = sellerPhotos;
    transaction.adminPhotos = adminPhotos;

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
        await pool.query(
          `INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
           VALUES ($1, $2, NOW())`,
          [id, itemStatus]
        );
      } else {
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


    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating transaction status:', error);
    res.status(500).json({ message: 'Failed to update transaction status', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Upload admin photos to Supabase Storage and save URLs to Photo table
 */
export const uploadAdminPhotos = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // transactionID

    console.log('📸 Uploading admin photos for transaction:', id);
    console.log('📸 Files received:', req.files);

    // Get the submittedApplianceID for this transaction
    const txnResult = await client.query(
      `SELECT "submittedApplianceID" FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      console.error('❌ Transaction not found:', id);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const submittedApplianceID = txnResult.rows[0].submittedApplianceID;
    console.log('📦 Submitted Appliance ID:', submittedApplianceID);

    // Upload photos to Supabase Storage
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.error('❌ No files received');
      return res.status(400).json({ message: 'No photos provided' });
    }

    console.log(`📸 Processing ${files.length} files...`);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
      const filePath = `${submittedApplianceID}/${fileName}`;

      console.log(`📤 Uploading file: ${fileName} (${file.size} bytes)`);

      // Upload to admin-review-photos bucket
      const { error: uploadError } = await supabase.storage
        .from('admin-review-photos')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }


      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('admin-review-photos')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL:', publicUrl);
      uploadedUrls.push(publicUrl);

      // Save to Photo table with remark='admin'
      await client.query(
        `INSERT INTO "Photo" ("submittedApplianceID", "photoURL", "remark", "uploadDate")
         VALUES ($1, $2, 'admin', NOW())`,
        [submittedApplianceID, publicUrl]
      );

      console.log('💾 Saved to Photo table');
    }


    res.status(200).json({
      message: 'Photos uploaded successfully',
      photoUrls: uploadedUrls
    });
  } catch (error) {
    console.error('❌ Error uploading admin photos:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      message: 'Failed to upload photos',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
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
      // All admin's dynamic answers (radio, checkbox, dropdown, image, textarea, file_upload)
      // Format: { [groupID]: conditionID | conditionID[] | textValue | base64Array }
      adminConditions,
      // Photo uploads from admin (base64 data URLs)
      photos
    } = req.body;

    console.log('📝 Updating transaction with full data:', { id, transactionStatus, itemStatus, finalPrice, adminConditions, hasPhotos: !!photos, photoCount: photos?.length });

    // Get the submittedApplianceID for this transaction
    const txnResult = await pool.query(
      `SELECT "submittedApplianceID" FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const submittedApplianceID = txnResult.rows[0].submittedApplianceID;

    // Find the applianceID by matching category, brand, and model
    let applianceID = null;
    if (category && brand && model) {
      const applianceResult = await pool.query(
        `SELECT a."applianceID"
         FROM "Appliance" a
         JOIN "Category" c ON a."categoryID" = c."categoryID"
         JOIN "Brand" b ON a."brandID" = b."brandID"
         WHERE c."categoryName" = $1 AND b."brandName" = $2 AND a."modelCode" = $3`,
        [category, brand, model]
      );

      if (applianceResult.rows.length > 0) {
        applianceID = applianceResult.rows[0].applianceID;
      } else {
        console.warn(`⚠️ No appliance found for ${category} ${brand} ${model}`);
      }
    }

    // Update SubmittedAppliance table (final price and appliance details)
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (finalPrice !== undefined && finalPrice !== null) {
      updateFields.push(`"finalOfferPrice" = $${paramIndex++}`);
      updateValues.push(finalPrice);
    }

    if (applianceID) {
      updateFields.push(`"applianceID" = $${paramIndex++}`);
      updateValues.push(applianceID);
    }

    if (updateFields.length > 0) {
      updateValues.push(submittedApplianceID);
      await pool.query(
        `UPDATE "SubmittedAppliance"
         SET ${updateFields.join(', ')}
         WHERE "submittedApplianceID" = $${paramIndex}`,
        updateValues
      );
    }

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
    // SAVE ADMIN DYNAMIC ANSWERS TO ConditionSelected
    // selectedBy = 'admin' for admin review
    // Handles ALL types: radio, checkbox, dropdown, image, textarea, file_upload
    // ─────────────────────────────────────────────────────────
    if (adminConditions && typeof adminConditions === 'object' && Object.keys(adminConditions).length > 0) {
      console.log('📋 Saving admin dynamic answers:', adminConditions);

      try {
        // Fetch condition groups to identify question types
        const groupTypesResult = await pool.query(
          `SELECT "groupID", question_type FROM "ConditionGroup"`
        );

        const groupTypes: { [key: string]: string } = {};
        groupTypesResult.rows.forEach(row => {
          groupTypes[row.groupID] = row.question_type;
        });

        console.log('📋 Group types:', groupTypes);

        // First, delete ALL existing admin answers for this submission
        await pool.query(
          `DELETE FROM "ConditionSelected"
           WHERE "submittedApplianceID" = $1 AND "selectedBy" = 'admin'`,
          [submittedApplianceID]
        );


        // Process each group answer
        for (const [groupID, value] of Object.entries(adminConditions)) {
          const questionType = groupTypes[groupID];
          console.log(`📋 Processing group ${groupID} (type: ${questionType}) with value:`, value);

          if (!value) {
            continue;
          }

          // Handle based on question type
          if (questionType === 'textarea') {
            // Save text value
            console.log(`📝 Saving textarea answer (${(value as string).length} chars)`);
            await pool.query(
              `INSERT INTO "ConditionSelected"
               ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID", "textValue")
               VALUES (NULL, $1, true, 'admin', NOW(), $2, $3)`,
              [submittedApplianceID, groupID, value]
            );
          } else if (questionType === 'file_upload') {
            // Save file upload URLs as JSON array in textValue
            const photoUrls = Array.isArray(value) ? value : [];
            console.log(`📸 Saving ${photoUrls.length} file upload URLs for group ${groupID}`);

            if (photoUrls.length > 0) {
              await pool.query(
                `INSERT INTO "ConditionSelected"
                 ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID", "textValue")
                 VALUES (NULL, $1, true, 'admin', NOW(), $2, $3)`,
                [submittedApplianceID, groupID, JSON.stringify(photoUrls)]
              );
            }
          } else if (questionType === 'checkbox') {
            // Array of conditionIDs
            const conditionIDs = Array.isArray(value) ? value : [value];

            for (const conditionID of conditionIDs) {
              if (!conditionID || (typeof conditionID === 'string' && conditionID.trim() === '')) continue;

              let actualConditionID = conditionID;

              // Look up conditionID if it's a description
              if (typeof conditionID !== 'string' || !conditionID.startsWith('CO')) {
                const condResult = await pool.query(
                  `SELECT "conditionID" FROM "ConditionOption"
                   WHERE "groupID" = $1 AND description = $2`,
                  [groupID, conditionID]
                );
                if (condResult.rows.length > 0) {
                  actualConditionID = condResult.rows[0].conditionID;
                } else {
                  console.warn(`⚠️ Condition not found: "${conditionID}" in group ${groupID}`);
                  continue;
                }
              }

              await pool.query(
                `INSERT INTO "ConditionSelected"
                 ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID")
                 VALUES ($1, $2, true, 'admin', NOW(), $3)`,
                [actualConditionID, submittedApplianceID, groupID]
              );
            }
          } else {
            // radio, dropdown, image - single conditionID
            console.log(`🔘 Saving ${questionType} answer: ${value}`);

            let actualConditionID = value;

            // Look up conditionID if it's a description
            if (typeof value !== 'string' || !value.startsWith('CO')) {
              const condResult = await pool.query(
                `SELECT "conditionID" FROM "ConditionOption"
                 WHERE "groupID" = $1 AND description = $2`,
                [groupID, value]
              );
              if (condResult.rows.length > 0) {
                actualConditionID = condResult.rows[0].conditionID;
              } else {
                console.warn(`⚠️ Condition not found: "${value}" in group ${groupID}`);
                continue;
              }
            }

            await pool.query(
              `INSERT INTO "ConditionSelected"
               ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID")
               VALUES ($1, $2, true, 'admin', NOW(), $3)`,
              [actualConditionID, submittedApplianceID, groupID]
            );
          }
        }

      } catch (conditionError) {
        console.error('❌ Error saving admin conditions:', conditionError);
        console.error('❌ Error details:', {
          message: conditionError instanceof Error ? conditionError.message : 'Unknown error',
          stack: conditionError instanceof Error ? conditionError.stack : undefined,
          adminConditions
        });
        throw conditionError;
      }
    }

    // ─────────────────────────────────────────────────────────
    // SAVE ADMIN PHOTOS TO Photo TABLE
    // photos is an array of { photoURL: string, remark?: string, groupID?: string }
    // remark: 'admin' to distinguish from seller photos
    // Only update if photos array is explicitly provided
    // ─────────────────────────────────────────────────────────
    if (photos && Array.isArray(photos) && photos.length > 0) {
      console.log('📷 Processing photos:', photos.length, 'photos');

      try {
        // Delete only existing ADMIN photos for this submission (keep seller photos)
        await pool.query(
          `DELETE FROM "Photo" WHERE "submittedApplianceID" = $1 AND "remark" = 'admin'`,
          [submittedApplianceID]
        );


        // Insert new admin photos with remark='admin' to distinguish from seller photos
        for (const photo of photos) {
          if (photo && photo.photoURL && photo.photoURL.trim() !== '') {
            await pool.query(
              `INSERT INTO "Photo" ("submittedApplianceID", "photoURL", "remark", "uploadDate")
               VALUES ($1, $2, 'admin', NOW())`,
              [submittedApplianceID, photo.photoURL]
            );
          }
        }

      } catch (photoError) {
        console.error('❌ Error saving photos:', photoError);
        console.error('❌ Photo error details:', {
          message: photoError instanceof Error ? photoError.message : 'Unknown error',
          photosCount: photos.length
        });
        throw photoError;
      }
    } else {
      console.log('📷 No photos to update (photos not provided or empty array)');
    }


    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({ message: 'Failed to update transaction', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};





/**
 * Update submission details (seller edit when Awaiting Pick Up)
 * Allows seller to edit pickup details, appliance model, and condition answers
 */
export const updateSubmissionDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      modelId,
      addressId,
      pickupDate,
      pickupTime,
      questionAnswers // JSON string of new answers
    } = req.body;

    console.log('📝 Updating submission details for transaction:', id);
    console.log('Payload:', req.body);

    // Get the submittedApplianceID for this transaction
    const txnResult = await pool.query(
      `SELECT "submittedApplianceID", "transactionStatus" FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const { submittedApplianceID, transactionStatus } = txnResult.rows[0];

    // Only allow editing if status is "Awaiting Pick Up"
    if (transactionStatus !== 'Awaiting Pick Up') {
      return res.status(403).json({
        message: 'Cannot edit submission. Transaction is no longer in "Awaiting Pick Up" status.'
      });
    }

    // Update appliance model if provided
    if (modelId) {
      await pool.query(
        `UPDATE "SubmittedAppliance"
         SET "applianceID" = $1
         WHERE "submittedApplianceID" = $2`,
        [modelId, submittedApplianceID]
      );
    }

    // Update pickup details if provided
    if (addressId || pickupDate || pickupTime) {
      // Get address details for snapshot
      const addressResult = await pool.query(
        `SELECT "receiverName", "phoneNum", "state", "city", "zipCode", "pickupAddress"
         FROM "Address" WHERE "addressID" = $1`,
        [addressId]
      );

      if (addressResult.rows.length > 0) {
        const addr = addressResult.rows[0];
        await pool.query(
          `UPDATE "Pickup"
           SET "addressID" = COALESCE($1, "addressID"),
               "pickupDate" = COALESCE($2, "pickupDate"),
               "pickupTimeSlot" = COALESCE($3, "pickupTimeSlot"),
               "snapshotReceiverName" = COALESCE($4, "snapshotReceiverName"),
               "snapshotPhoneNum" = COALESCE($5, "snapshotPhoneNum"),
               "snapshotState" = COALESCE($6, "snapshotState"),
               "snapshotCity" = COALESCE($7, "snapshotCity"),
               "snapshotZipCode" = COALESCE($8, "snapshotZipCode"),
               "snapshotAddress" = COALESCE($9, "snapshotAddress")
           WHERE "submittedApplianceID" = $10`,
          [
            addressId,
            pickupDate,
            pickupTime,
            addr.receiverName,
            addr.phoneNum,
            addr.state,
            addr.city,
            addr.zipCode,
            addr.pickupAddress,
            submittedApplianceID
          ]
        );
      }
    }

    // Update condition answers if provided
    if (questionAnswers) {
      const answers = JSON.parse(questionAnswers);
      console.log('📋 Updating condition answers:', answers);

      // Delete existing condition selections for this submission
      await pool.query(
        `DELETE FROM "ConditionSelected" WHERE "submittedApplianceID" = $1`,
        [submittedApplianceID]
      );

      // Insert new selections
      for (const answer of answers) {
        if (answer.type === 'checkbox' && Array.isArray(answer.answer)) {
          // Multiple selections
          for (const conditionId of answer.answer) {
            await pool.query(
              `INSERT INTO "ConditionSelected" ("submittedApplianceID", "conditionID", "isChecked")
               VALUES ($1, $2, true)`,
              [submittedApplianceID, conditionId]
            );
          }
        } else if (answer.type === 'radio' || answer.type === 'image') {
          // Single selection
          if (answer.answer) {
            await pool.query(
              `INSERT INTO "ConditionSelected" ("submittedApplianceID", "conditionID", "isChecked")
               VALUES ($1, $2, true)`,
              [submittedApplianceID, answer.answer]
            );
          }
        }
      }
    }

    // Mark transaction as updated
    await pool.query(
      `UPDATE "Transaction" SET "updatedAt" = NOW() WHERE "transactionID" = $1`,
      [id]
    );


    res.json({
      message: 'Submission details updated successfully',
      transactionID: id
    });
  } catch (error) {
    console.error('❌ Error updating submission details:', error);
    res.status(500).json({
      message: 'Failed to update submission details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update customer information (seller can edit when item status is Awaiting Pick Up)
 * Allows seller to update receiver name, phone, address, city, state, zip code, pickup date, and time slot
 */
export const updateCustomerInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      snapshotReceiverName,
      snapshotPhoneNum,
      snapshotAddress,
      snapshotCity,
      snapshotState,
      snapshotZipCode,
      pickupDate,
      pickupTimeSlot
    } = req.body;

    console.log('📝 Updating customer info for transaction:', id);
    console.log('Payload:', req.body);

    // Get the submittedApplianceID and check item status
    const txnResult = await pool.query(
      `SELECT sa."submittedApplianceID", i."itemStatus"
       FROM "Transaction" t
       INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
       LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
       WHERE t."transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const { submittedApplianceID, itemStatus } = txnResult.rows[0];

    // Only allow editing if item status is "Awaiting Pick Up"
    if (itemStatus !== 'Awaiting Pick Up') {
      return res.status(403).json({
        message: 'Cannot edit customer information. Item is not in "Awaiting Pick Up" status.'
      });
    }

    // Update pickup information in the Pickup table
    await pool.query(
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
      [
        snapshotReceiverName,
        snapshotPhoneNum,
        snapshotAddress,
        snapshotCity,
        snapshotState,
        snapshotZipCode,
        pickupDate,
        pickupTimeSlot,
        submittedApplianceID
      ]
    );


    // Mark transaction as updated
    await pool.query(
      `UPDATE "Transaction" SET "updatedAt" = NOW() WHERE "transactionID" = $1`,
      [id]
    );

    res.json({
      message: 'Customer information updated successfully',
      transactionID: id
    });
  } catch (error) {
    console.error('❌ Error updating customer information:', error);
    res.status(500).json({
      message: 'Failed to update customer information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
