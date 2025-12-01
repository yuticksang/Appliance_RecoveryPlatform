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
        t."buyerID" as "buyerId",
        u.name as "sellerName",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa."initialScore" as "initialScore",
        sa."finalScore" as "finalScore",
        t."transactionStatus",
        t."createdAt",
        t."updatedAt",
        t."paymentDueDate",
        t."rejectionReason",
        t."responseDeadline",
        i."itemStatus",
        i."updatedAt" as "itemStatusUpdatedAt",
        b."brandName" as brand,
        c."categoryName" as category,
        a."modelCode" as model,
        a."modelName" as "modelName",
        a.image_url as "imageUrl"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      LEFT JOIN users u ON t."sellerID" = u.seller_id
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
    console.error(' Error fetching transactions by seller:', error);
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
        t."buyerID" as "buyerId",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        sa."initialOfferPrice" as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa."initialScore" as "initialScore",
        sa."finalScore" as "finalScore",
        t."transactionStatus",
        t."createdAt",
        t."updatedAt",
        t."paymentDueDate",
        t."rejectionReason",
        t."responseDeadline",
        i."itemStatus",
        i."updatedAt" as "itemStatusUpdatedAt",
        b."brandName" as brand,
        c."categoryName" as category,
        a."modelCode" as model,
        a."modelName" as "modelName",
        a.image_url as "imageUrl"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      LEFT JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a."applianceID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      ORDER BY sa."submissionDate" DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(' Error fetching all transactions:', error);
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
        sa."initialScore" as "initialScore",
        sa."finalScore" as "finalScore",
        t."transactionStatus",
        t."createdAt",
        t."updatedAt",
        t."paymentDueDate",
        t."responseDeadline",
        t."rejectionReason",
        COALESCE(i."itemStatus", 'Awaiting Pick Up') as "itemStatus",
        i."updatedAt" as "itemStatusUpdatedAt",
        -- Original appliance (seller's submission)
        COALESCE(b."brandName", 'Unknown') as brand,
        b."brandID" as "brandId",
        COALESCE(c."categoryName", 'Unknown') as category,
        c."categoryID" as "categoryId",
        COALESCE(a."modelCode", 'N/A') as model,
        a."applianceID" as "modelId",
        COALESCE(a."modelName", 'N/A') as "modelName",
        COALESCE(a.image_url, '') as "imageUrl",
        -- Final appliance (admin's correction, if changed)
        COALESCE(fb."brandName", b."brandName", 'Unknown') as "finalBrand",
        COALESCE(fc."categoryName", c."categoryName", 'Unknown') as "finalCategory",
        COALESCE(fa."modelCode", a."modelCode", 'N/A') as "finalModel",
        COALESCE(fa."modelName", a."modelName", 'N/A') as "finalModelName",
        -- Pickup details
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
      -- Original appliance joins
      LEFT JOIN "Appliance" a ON sa."applianceID" = a."applianceID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      -- Final appliance joins (admin's correction)
      LEFT JOIN "Appliance" fa ON sa."finalApplianceID" = fa."applianceID"
      LEFT JOIN "Brand" fb ON fa."brandID" = fb."brandID"
      LEFT JOIN "Category" fc ON fa."categoryID" = fc."categoryID"
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

    // NEW: Fetch DYNAMIC question-answer pairs (SELLER only - for recovery slip)
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
       WHERE cs."submittedApplianceID" = $1
       AND cs."isChecked" = true
       AND COALESCE(cs."selectedBy", 'seller') = 'seller'
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

    // Fetch all condition groups for this specific category that were active at submission time
    // This ensures old transactions only show groups that existed when they were submitted
    // This query is used for BOTH seller view AND admin edit
    const conditionGroupsResult = await pool.query(
      `SELECT DISTINCT cg."groupID", cg."criteriaName", cg.question_type, COALESCE(cg.display_order, 999999) as display_order
       FROM "ConditionGroup" cg
       WHERE cg."groupID" IN (
         -- Get all unique groupIDs that have data for this submission
         -- These should ALWAYS show regardless of current status
         SELECT DISTINCT COALESCE(co."groupID", cs."groupID") as "groupID"
         FROM "ConditionSelected" cs
         LEFT JOIN "ConditionOption" co ON cs."conditionID" = co."conditionID"
         WHERE cs."submittedApplianceID" = $1
         AND cs."isChecked" = true
         
         UNION
         
         -- Also include ALL groups that existed before or at submission time
         -- (for empty groups - show them regardless of current active/inactive status)
         SELECT cg2."groupID"
         FROM "ConditionGroup" cg2
         WHERE cg2."created_at" <= (
           SELECT sa."submissionDate" 
           FROM "SubmittedAppliance" sa 
           WHERE sa."submittedApplianceID" = $1
         )
         AND (
           EXISTS (
             SELECT 1 FROM "Category_ConditionGroup" ccg
             WHERE ccg."groupID" = cg2."groupID" AND ccg."categoryID" = $2
           )
           OR NOT EXISTS (
             SELECT 1 FROM "Category_ConditionGroup" WHERE "groupID" = cg2."groupID"
           )
         )
       )
       ORDER BY display_order ASC`,
      [transaction.submittedApplianceID, transaction.categoryID]
    );

    console.log('� Condition groups for this transaction:', conditionGroupsResult.rows);

    // Create conditionGroupNames mapping with display_order and question_type
    const conditionGroupNames: Record<string, string> = {};
    const conditionGroupOrder: Record<string, number> = {};
    const conditionGroupTypes: Record<string, string> = {};
    conditionGroupsResult.rows.forEach(row => {
      conditionGroupNames[row.groupID] = row.criteriaName;
      conditionGroupOrder[row.groupID] = row.display_order ?? 999999;
      conditionGroupTypes[row.groupID] = row.question_type;
    });

    console.log('� Condition group names mapping:', conditionGroupNames);
    console.log('� Condition group order mapping:', conditionGroupOrder);
    console.log('� Condition group types mapping:', conditionGroupTypes);

    // Group conditions by groupID and selectedBy (seller vs admin)
    // Using groupID instead of criteriaName for better mapping
    const sellerConditions: { [key: string]: string | string[] } = {};
    const adminConditions: { [key: string]: string | string[] } = {};

    conditionsResult.rows.forEach(row => {
      console.log(`� Processing condition: ${row.description || row.textValue}, Group: ${row.criteriaName} (${row.groupID}), Type: ${row.question_type}, SelectedBy: ${row.selectedBy}`);

      const groupID = row.groupID;
      const questionType = row.question_type;

      // Handle different question types
      let value: string | string[];

      if (questionType === 'textarea') {
        // For textarea, use textValue (free-form text)
        value = row.textValue || '';
        console.log(`� Textarea value for ${groupID}:`, value);
      } else if (questionType === 'file_upload') {
        // For file_upload, parse JSON array from textValue
        try {
          value = row.textValue ? JSON.parse(row.textValue) : [];
          console.log(`� File upload value for ${groupID}:`, value);
        } catch (e) {
          console.error(` Error parsing file_upload JSON for ${groupID}:`, e);
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

    console.log('� Seller conditions:', sellerConditions);
    console.log('� Admin conditions:', adminConditions);

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

    // Include conditionGroupNames, conditionGroupOrder, and conditionGroupTypes in the response
    transaction.conditionGroupNames = conditionGroupNames;
    transaction.conditionGroupOrder = conditionGroupOrder;
    transaction.conditionGroupTypes = conditionGroupTypes;

    console.log(` Found transaction ${id}:`, transaction);
    console.log(`� Selected issues:`, transaction.selectedIssues);
    console.log(`� Photos:`, transaction.photos);

    // Disable caching to ensure fresh data is always returned
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json(transaction);
  } catch (error) {
    console.error(' Error fetching transaction by ID:', error);
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

    console.log('� Creating new transaction:', { submittedApplianceID, sellerID });

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
    console.error(' Error creating transaction:', error);
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

    console.log('� Updating transaction:', { id, transactionStatus, itemStatus });

    // Update transaction status with automatic deadline setting
    if (transactionStatus) {
      console.log('� Updating transaction status to:', transactionStatus);

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
        console.log('� Setting responseDeadline to 14 days from now');
      } else if (transactionStatus === 'Pending Payment') {
        // Set paymentDueDate to 14 days from now
        updateQuery = `UPDATE "Transaction"
         SET "transactionStatus" = $1, "updatedAt" = NOW(), "paymentDueDate" = NOW() + INTERVAL '14 days'
         WHERE "transactionID" = $2
         RETURNING *`;
        queryParams = [transactionStatus, id];
        console.log('� Setting paymentDueDate to 14 days from now');
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
        console.error(' No transaction found with ID:', id);
        return res.status(404).json({ message: 'Transaction not found' });
      }
    }

    // Update item status (try update first, then insert if needed)
    if (itemStatus) {
      console.log('� Updating item status to:', itemStatus);

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
    console.error(' Error updating transaction status:', error);
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

    console.log('� Uploading admin photos for transaction:', id);
    console.log('� Files received:', req.files);

    // Get the submittedApplianceID for this transaction
    const txnResult = await client.query(
      `SELECT "submittedApplianceID" FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      console.error(' Transaction not found:', id);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const submittedApplianceID = txnResult.rows[0].submittedApplianceID;
    console.log('� Submitted Appliance ID:', submittedApplianceID);

    // Upload photos to Supabase Storage
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.error(' No files received');
      return res.status(400).json({ message: 'No photos provided' });
    }

    console.log(`� Processing ${files.length} files...`);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
      const filePath = `${submittedApplianceID}/${fileName}`;

      console.log(`� Uploading file: ${fileName} (${file.size} bytes)`);

      // Upload to admin-review-photos bucket
      const { error: uploadError } = await supabase.storage
        .from('admin-review-photos')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error(' Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }


      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('admin-review-photos')
        .getPublicUrl(filePath);

      console.log('� Public URL:', publicUrl);
      uploadedUrls.push(publicUrl);

      // Save to Photo table with remark='admin'
      await client.query(
        `INSERT INTO "Photo" ("submittedApplianceID", "photoURL", "remark", "uploadDate")
         VALUES ($1, $2, 'admin', NOW())`,
        [submittedApplianceID, publicUrl]
      );

      console.log('� Saved to Photo table');
    }


    res.status(200).json({
      message: 'Photos uploaded successfully',
      photoUrls: uploadedUrls
    });
  } catch (error) {
    console.error(' Error uploading admin photos:', error);
    console.error(' Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      message: 'Failed to upload photos',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const getConditionOptionsByGroupIds = async (req: Request, res: Response) => {
  try {
    const { groupIds } = req.query; // Comma-separated group IDs

    if (!groupIds || typeof groupIds !== 'string') {
      return res.status(400).json({ message: 'groupIds parameter is required' });
    }

    const groupIdArray = groupIds.split(',');

    const result = await pool.query(
      `SELECT co."conditionID", co."groupID", co.code, co.description, co.question, co.image
         FROM "ConditionOption" co
         WHERE co."groupID" = ANY($1)
         ORDER BY co."conditionID"`,
      [groupIdArray]
    );

    // Group options by groupID
    const optionsByGroup: { [key: string]: any[] } = {};
    result.rows.forEach(row => {
      if (!optionsByGroup[row.groupID]) {
        optionsByGroup[row.groupID] = [];
      }
      optionsByGroup[row.groupID].push(row);
    });

    res.json(optionsByGroup);
  } catch (error) {
    console.error(' Error fetching condition options by group IDs:', error);
    res.status(500).json({ message: 'Failed to fetch condition options' });
  }
};


/**
 * Helper function to calculate price based on condition selections
 * Replicates the logic from calculateValuationController.ts
 */
const calculatePriceFromConditions = async (modelId: string, conditionIds: string[]): Promise<number> => {
  try {
    console.log(`🧮 Calculating price for Model: ${modelId} with Conditions:`, conditionIds);

    // PRICING ENGINE - Get base prices from buyers
    const basePriceQuery = await pool.query(
      `SELECT "buyerID", "basePrice"
       FROM "BuyerAppliance"
       WHERE "applianceID" = $1
       AND "status" = 'ACTIVE'`,
      [modelId]
    );

    const buyers = basePriceQuery.rows;

    if (buyers.length === 0) {
      console.log('⚠ No active buyers found for this appliance');
      return 0;
    }

    const buyerIds = buyers.map(b => b.buyerID);
    let markdowns: any[] = [];

    if (conditionIds.length > 0) {
      const markdownsQuery = await pool.query(
        `SELECT bm."buyerID", bm."markdownPercentage", bm."conditionID", co."description"
         FROM "BuyerMarkdown" bm
         JOIN "ConditionOption" co ON bm."conditionID" = co."conditionID"
         WHERE bm."buyerID" = ANY($1)
         AND bm."conditionID" = ANY($2)`,
        [buyerIds, conditionIds]
      );

      markdowns = markdownsQuery.rows;
    }

    let highestOffer = 0;
    let highestBuyerId: string | null = null;

    buyers.forEach(buyer => {
      const base = parseFloat(buyer.basePrice);
      const buyerId = buyer.buyerID;

      const applicableMarkdowns = markdowns.filter(m => m.buyerID === buyerId);

      // Check if buyer has rules for all selected conditions
      const hasValidRules = conditionIds.every((selectedId: string) => {
        const match = applicableMarkdowns.find(m => m.conditionID === selectedId);
        return match && match.markdownPercentage != null;
      });

      if (!hasValidRules) {
        return; // Skip this buyer
      }

      const totalMarkdownPercentage = applicableMarkdowns.reduce((sum, m) => {
        return sum + parseFloat(m.markdownPercentage);
      }, 0);

      const effectiveMarkdown = Math.min(totalMarkdownPercentage, 100);
      const finalPrice = base * (1 - effectiveMarkdown / 100);

      if (finalPrice > highestOffer) {
        highestOffer = finalPrice;
        highestBuyerId = buyerId;
      }
    });

    console.log(`� Calculated price: RM${Math.round(highestOffer)} from buyer ${highestBuyerId}`);
    return Math.round(highestOffer);
  } catch (error) {
    console.error(' Error calculating price:', error);
    return 0;
  }
};

/**
 * Update transaction with full data (admin edit)
 * Now supports dynamic condition selections stored in ConditionSelected table
 * Price is automatically calculated from admin condition selections
 */
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      transactionStatus,
      itemStatus,
      brand,
      model,
      category,
      // All admin's dynamic answers (radio, checkbox, dropdown, image, textarea, file_upload)
      // Format: { [groupID]: conditionID | conditionID[] | textValue | base64Array }
      adminConditions,
      // Photo uploads from admin (base64 data URLs)
      photos,
      // Final score from admin review
      finalScore,
      // Final appliance ID selected by admin (if category/brand/model changed)
      finalApplianceID
    } = req.body;

    console.log('Updating transaction with full data:', { id, transactionStatus, itemStatus, adminConditions, hasPhotos: !!photos, photoCount: photos?.length, finalScore });

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
        console.warn(`⚠ No appliance found for ${category} ${brand} ${model}`);
      }
    }

    // ─────────────────────────────────────────────────────────
    // CALCULATE FINAL PRICE FROM ADMIN CONDITIONS
    // Price is automatically calculated based on condition selections
    // ─────────────────────────────────────────────────────────
    let calculatedFinalPrice: number | null = null;

    if (applianceID && adminConditions && typeof adminConditions === 'object') {
      // Extract all conditionIDs from adminConditions
      const conditionIds: string[] = [];

      for (const [groupID, value] of Object.entries(adminConditions)) {
        if (!value) continue;

        // Fetch group type to know how to extract conditionIDs
        const groupTypeResult = await pool.query(
          `SELECT question_type FROM "ConditionGroup" WHERE "groupID" = $1`,
          [groupID]
        );

        const questionType = groupTypeResult.rows[0]?.question_type;

        // Only extract conditionIDs for types that have them (skip textarea and file_upload)
        if (questionType && questionType !== 'textarea' && questionType !== 'file_upload') {
          if (questionType === 'checkbox' && Array.isArray(value)) {
            // For checkbox, add all selected conditionIDs
            for (const item of value) {
              if (typeof item === 'string' && item.startsWith('CO')) {
                conditionIds.push(item);
              } else if (typeof item === 'string') {
                // It's a description, look up the conditionID
                const condResult = await pool.query(
                  `SELECT "conditionID" FROM "ConditionOption" WHERE "groupID" = $1 AND description = $2`,
                  [groupID, item]
                );
                if (condResult.rows.length > 0) {
                  conditionIds.push(condResult.rows[0].conditionID);
                }
              }
            }
          } else {
            // For radio, dropdown, image - single value
            if (typeof value === 'string' && value.startsWith('CO')) {
              conditionIds.push(value as string);
            } else if (typeof value === 'string') {
              // It's a description, look up the conditionID
              const condResult = await pool.query(
                `SELECT "conditionID" FROM "ConditionOption" WHERE "groupID" = $1 AND description = $2`,
                [groupID, value]
              );
              if (condResult.rows.length > 0) {
                conditionIds.push(condResult.rows[0].conditionID);
              }
            }
          }
        }
      }

      console.log('� Calculating final price with conditionIDs:', conditionIds);

      // Calculate price based on conditions
      if (conditionIds.length > 0) {
        calculatedFinalPrice = await calculatePriceFromConditions(applianceID, conditionIds);
        console.log('� Calculated final price:', calculatedFinalPrice);
      }
    }

    // Update SubmittedAppliance table (final price, final score, and appliance details)
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Use calculated price instead of manual input
    if (calculatedFinalPrice !== null) {
      updateFields.push(`"finalOfferPrice" = $${paramIndex++}`);
      updateValues.push(calculatedFinalPrice);
      console.log(`� Updating finalOfferPrice to RM${calculatedFinalPrice}`);
    }

    // Save final score from admin review
    if (finalScore !== undefined && finalScore !== null) {
      updateFields.push(`"finalScore" = $${paramIndex++}`);
      updateValues.push(parseFloat(finalScore));
      console.log(`📊 Updating finalScore to ${finalScore}`);
    }

    // Save finalApplianceID if admin changed the appliance details
    // DO NOT update applianceID - keep the original seller's submission
    if (finalApplianceID) {
      updateFields.push(`"finalApplianceID" = $${paramIndex++}`);
      updateValues.push(finalApplianceID);
      console.log(`🔄 Updating finalApplianceID to ${finalApplianceID} (keeping original applianceID unchanged)`);
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
      // If status is "Awaiting Confirmation", set responseDeadline to 14 days from now
      if (transactionStatus === 'Awaiting Confirmation') {
        await pool.query(
          `UPDATE "Transaction"
           SET "transactionStatus" = $1, "updatedAt" = NOW(), "responseDeadline" = NOW() + INTERVAL '14 days'
           WHERE "transactionID" = $2`,
          [transactionStatus, id]
        );
        console.log('📅 Setting responseDeadline to 14 days from now for status: Awaiting Confirmation');
      } else {
        await pool.query(
          `UPDATE "Transaction"
           SET "transactionStatus" = $1, "updatedAt" = NOW()
           WHERE "transactionID" = $2`,
          [transactionStatus, id]
        );
      }
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
      console.log('� Saving admin dynamic answers:', adminConditions);

      try {
        // Fetch condition groups to identify question types
        const groupTypesResult = await pool.query(
          `SELECT "groupID", question_type FROM "ConditionGroup"`
        );

        const groupTypes: { [key: string]: string } = {};
        groupTypesResult.rows.forEach(row => {
          groupTypes[row.groupID] = row.question_type;
        });

        console.log('� Group types:', groupTypes);

        // First, delete ALL existing admin answers for this submission
        await pool.query(
          `DELETE FROM "ConditionSelected"
           WHERE "submittedApplianceID" = $1 AND "selectedBy" = 'admin'`,
          [submittedApplianceID]
        );

        // Reset the sequence to avoid duplicate key errors
        await pool.query(`
          SELECT setval('condition_selected_id_seq',
            COALESCE((SELECT MAX(CAST(SUBSTRING("conditionSelectionID" FROM 3) AS INTEGER)) FROM "ConditionSelected"), 0) + 1,
            false)
        `);


        // Process each group answer
        for (const [groupID, value] of Object.entries(adminConditions)) {
          const questionType = groupTypes[groupID];
          console.log(`� Processing group ${groupID} (type: ${questionType}) with value:`, value);

          if (!value) {
            continue;
          }

          // Handle based on question type
          if (questionType === 'textarea') {
            // Save text value
            console.log(`� Saving textarea answer (${(value as string).length} chars)`);
            await pool.query(
              `INSERT INTO "ConditionSelected"
               ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID", "textValue")
               VALUES (NULL, $1, true, 'admin', NOW(), $2, $3)`,
              [submittedApplianceID, groupID, value]
            );
          } else if (questionType === 'file_upload') {
            // Save file upload URLs as JSON array in textValue
            const photoUrls = Array.isArray(value) ? value : [];
            console.log(`� Saving ${photoUrls.length} file upload URLs for group ${groupID}`);

            if (photoUrls.length > 0) {
              await pool.query(
                `INSERT INTO "ConditionSelected"
                 ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID", "textValue")
                 VALUES (NULL, $1, true, 'admin', NOW(), $2, $3)`,
                [submittedApplianceID, groupID, JSON.stringify(photoUrls)]
              );
            }
          } else if (questionType === 'checkbox') {
            // Array of conditionIDs or descriptions
            const conditionIDs = Array.isArray(value) ? value : [value];

            for (const conditionID of conditionIDs) {
              if (!conditionID || (typeof conditionID === 'string' && conditionID.trim() === '')) continue;

              let actualConditionID = conditionID;
              let descriptionText = conditionID; // Default to the value itself

              // Look up conditionID and description
              if (typeof conditionID !== 'string' || !conditionID.startsWith('CO')) {
                // Value is a description, look up the conditionID
                const condResult = await pool.query(
                  `SELECT "conditionID", description FROM "ConditionOption"
                   WHERE "groupID" = $1 AND description = $2`,
                  [groupID, conditionID]
                );
                if (condResult.rows.length > 0) {
                  actualConditionID = condResult.rows[0].conditionID;
                  descriptionText = condResult.rows[0].description;
                } else {
                  console.warn(`⚠ Condition not found: "${conditionID}" in group ${groupID}`);
                  continue;
                }
              } else {
                // Value is a conditionID, fetch the description
                const condResult = await pool.query(
                  `SELECT description FROM "ConditionOption" WHERE "conditionID" = $1`,
                  [actualConditionID]
                );
                if (condResult.rows.length > 0) {
                  descriptionText = condResult.rows[0].description;
                }
              }

              // Store both conditionID and description text in textValue for easy reference
              await pool.query(
                `INSERT INTO "ConditionSelected"
                 ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID", "textValue")
                 VALUES ($1, $2, true, 'admin', NOW(), $3, $4)`,
                [actualConditionID, submittedApplianceID, groupID, descriptionText]
              );
            }
          } else {
            // radio, dropdown, image - single conditionID or description
            console.log(`� Saving ${questionType} answer: ${value}`);

            let actualConditionID = value;
            let descriptionText = value; // Default to the value itself

            // Look up conditionID and description
            if (typeof value !== 'string' || !value.startsWith('CO')) {
              // Value is a description, look up the conditionID
              const condResult = await pool.query(
                `SELECT "conditionID", description FROM "ConditionOption"
                 WHERE "groupID" = $1 AND description = $2`,
                [groupID, value]
              );
              if (condResult.rows.length > 0) {
                actualConditionID = condResult.rows[0].conditionID;
                descriptionText = condResult.rows[0].description;
              } else {
                console.warn(`⚠ Condition not found: "${value}" in group ${groupID}`);
                continue;
              }
            } else {
              // Value is a conditionID, fetch the description
              const condResult = await pool.query(
                `SELECT description FROM "ConditionOption" WHERE "conditionID" = $1`,
                [actualConditionID]
              );
              if (condResult.rows.length > 0) {
                descriptionText = condResult.rows[0].description;
              }
            }

            // Store both conditionID and description text in textValue for easy reference
            await pool.query(
              `INSERT INTO "ConditionSelected"
               ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID", "textValue")
               VALUES ($1, $2, true, 'admin', NOW(), $3, $4)`,
              [actualConditionID, submittedApplianceID, groupID, descriptionText]
            );
          }
        }

      } catch (conditionError) {
        console.error(' Error saving admin conditions:', conditionError);
        console.error(' Error details:', {
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
      console.log('� Processing photos:', photos.length, 'photos');

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
        console.error(' Error saving photos:', photoError);
        console.error(' Photo error details:', {
          message: photoError instanceof Error ? photoError.message : 'Unknown error',
          photosCount: photos.length
        });
        throw photoError;
      }
    } else {
      console.log('� No photos to update (photos not provided or empty array)');
    }


    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error(' Error updating transaction:', error);
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

    console.log('� Updating submission details for transaction:', id);
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
      console.log('� Updating condition answers:', answers);

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
    console.error(' Error updating submission details:', error);
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

    console.log('� Updating customer info for transaction:', id);
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
    console.error(' Error updating customer information:', error);
    res.status(500).json({
      message: 'Failed to update customer information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a transaction (admin only)
 * Deletes transaction and all related data
 */
export const deleteTransaction = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const authUser = (req as any).user; // From JWT token

    console.log('🗑️ Deleting transaction:', id);

    // Only allow admins to delete transactions
    if (authUser.userType !== 'admin' && authUser.userType !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized. Only admins can delete transactions.' });
    }

    await client.query('BEGIN');

    // Get the submittedApplianceID for this transaction
    const txnResult = await client.query(
      `SELECT "submittedApplianceID" FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    if (txnResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const submittedApplianceID = txnResult.rows[0].submittedApplianceID;

    // Delete related records in order (due to foreign key constraints)

    // 1. Delete ItemStatus
    await client.query(
      `DELETE FROM "ItemStatus" WHERE "transactionID" = $1`,
      [id]
    );

    // 2. Delete Transaction
    await client.query(
      `DELETE FROM "Transaction" WHERE "transactionID" = $1`,
      [id]
    );

    // 3. Delete ConditionSelected
    await client.query(
      `DELETE FROM "ConditionSelected" WHERE "submittedApplianceID" = $1`,
      [submittedApplianceID]
    );

    // 4. Delete Photos
    await client.query(
      `DELETE FROM "Photo" WHERE "submittedApplianceID" = $1`,
      [submittedApplianceID]
    );

    // 5. Delete Pickup
    await client.query(
      `DELETE FROM "Pickup" WHERE "submittedApplianceID" = $1`,
      [submittedApplianceID]
    );

    // 6. Finally delete SubmittedAppliance
    await client.query(
      `DELETE FROM "SubmittedAppliance" WHERE "submittedApplianceID" = $1`,
      [submittedApplianceID]
    );

    await client.query('COMMIT');

    console.log('✅ Transaction deleted successfully:', id);

    res.json({
      message: 'Transaction deleted successfully',
      transactionID: id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting transaction:', error);
    res.status(500).json({
      message: 'Failed to delete transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

/**
 * Get all transactions for a specific buyer
 * Shows transactions where this buyer won (has the highest offer)
 */
export const getTransactionsByBuyer = async (req: Request, res: Response) => {
  try {
    const { buyerId } = req.params;
    const authUser = (req as any).user;

    // ✅ Security check: Buyers can only view their own transactions
    if (authUser.userType === 'buyer') {
      const userCheckResult = await pool.query(
        `SELECT buyer_id FROM users WHERE "userID" = $1 AND user_type = 'buyer'`,
        [authUser.userId]
      );

      if (userCheckResult.rows.length === 0) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      const userBuyerId = userCheckResult.rows[0].buyer_id;

      if (userBuyerId !== buyerId) {
        return res.status(403).json({ message: 'You can only view your own transactions' });
      }
    }

    // ✅ Fetch transactions where this buyer won
    const result = await pool.query(
      `SELECT
        t."transactionID" as id,
        t."sellerID" as "sellerId",
        t."buyerID" as "buyerId",
        COALESCE(u.name, 'Unknown') as "sellerName",
        sa."submittedApplianceID",
        sa."submissionDate" as "submittedDate",
        COALESCE(sa."initialOfferPrice", 0) as "estimatedPrice",
        sa."finalOfferPrice" as "finalPrice",
        sa."initialScore" as "initialScore",
        sa."finalScore" as "finalScore",
        t."transactionStatus",
        t."createdAt",
        t."updatedAt",
        t."paymentDueDate",
        t."rejectionReason",
        t."responseDeadline",
        COALESCE(i."itemStatus", 'Awaiting Pick Up') as "itemStatus",
        i."updatedAt" as "itemStatusUpdatedAt",
        COALESCE(b."brandName", 'Unknown') as brand,
        COALESCE(c."categoryName", 'Unknown') as category,
        COALESCE(a."modelCode", 'N/A') as model,
        COALESCE(a."modelName", 'N/A') as "modelName",
        COALESCE(a.image_url, '') as "imageUrl"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      LEFT JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a."applianceID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      WHERE t."buyerID" = $1
      AND t."transactionStatus" IN ('Awaiting Confirmation', 'Confirmed', 'Completed')
      ORDER BY sa."submissionDate" DESC`,
      [buyerId]
    );

    console.log(`📊 Found ${result.rows.length} transactions for buyer ${buyerId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching transactions by buyer:', error);
    res.status(500).json({ 
      message: 'Failed to fetch transactions', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};
