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
        a.brand,
        a.category,
        a.model,
        a.model_name as "modelName",
        a.image_url as "imageUrl"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      INNER JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a.appliance_id
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
        a.brand,
        a.category,
        a.model,
        a.model_name as "modelName",
        a.image_url as "imageUrl"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      INNER JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a.appliance_id
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
        u.name as "sellerName",
        u.email as "sellerEmail",
        u.phone as "sellerPhone",
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
        a.brand,
        a.category,
        a.model,
        a.model_name as "modelName",
        a.image_url as "imageUrl",
        pa.name as "addressName",
        pa.phone as "addressPhone",
        pa.state,
        pa.city,
        pa.zip_code as "zipCode",
        pa.pickup_address as "pickupAddress"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      INNER JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a.appliance_id
      LEFT JOIN pickup_address pa ON sa."addressID" = pa.id
      WHERE t."transactionID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    console.log(`✅ Found transaction ${id}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching transaction by ID:', error);
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

    // Update transaction status
    if (transactionStatus) {
      await pool.query(
        `UPDATE "Transaction"
         SET "transactionStatus" = $1, "updatedAt" = NOW()
         WHERE "transactionID" = $2`,
        [transactionStatus, id]
      );
    }

    // Update item status
    if (itemStatus) {
      await pool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = $1, "updatedAt" = NOW()
         WHERE "transactionID" = $2`,
        [itemStatus, id]
      );
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
        a.brand,
        a.category,
        a.model,
        a.model_name as "modelName"
      FROM "Transaction" t
      INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
      INNER JOIN users u ON t."sellerID" = u.seller_id
      LEFT JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
      LEFT JOIN "Appliance" a ON sa."applianceID" = a.appliance_id
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
