import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * SHARED LOGIC: Auto-cancel overdue transactions
 * Can be called from both cron job and API endpoint
 */
export const executeAutoCancellation = async () => {
  try {
    console.log('🤖 Running auto-cancellation check...');

    // -----------------------------
    // CASE 3: No response to offer
    // -----------------------------
    const case3Query = await pool.query(
      `SELECT "transactionID", "sellerID"
       FROM "Transaction"
       WHERE "transactionStatus" = 'Awaiting Confirmation'
       AND "responseDeadline" IS NOT NULL
       AND "responseDeadline" < NOW()`
    );

    const case3Rows = case3Query.rows;

    if (case3Rows.length > 0) {
      const case3TxnIds = case3Rows.map(r => r.transactionID);

      // Update Transaction
      await pool.query(
        `UPDATE "Transaction"
         SET "transactionStatus" = 'Cancelled',
             "cancellationReason" = 'system',
             "rejectionReason" = 'No response to offer within deadline',
             "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::text[])`,
        [case3TxnIds]
      );

      // Update ItemStatus
      await pool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = 'Unresponded', "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::text[])`,
        [case3TxnIds]
      );

      // Insert notifications
      for (const row of case3Rows) {
        await pool.query(
          `INSERT INTO "Notification" ("sellerID", "message", "dateSent")
           VALUES ($1, $2, NOW())`,
          [
            row.sellerID,
            `🚨 Transaction ${row.transactionID} has been cancelled by the system due to no response within the deadline.`
          ]
        );
      }

      console.log(`✅ Case 3: Cancelled ${case3Rows.length} transactions (no offer response).`);
    }

    // -----------------------------
    // CASE 4: No response to pickup
    // -----------------------------
    const case4Query = await pool.query(
      `SELECT t."transactionID", t."sellerID"
       FROM "Transaction" t
       JOIN "ItemStatus" i ON t."transactionID" = i."transactionID"
       WHERE i."itemStatus" = 'Awaiting Pick Up'
       AND i."updatedAt" < NOW() - INTERVAL '14 days'
       AND t."transactionStatus" NOT IN ('Cancelled', 'Completed', 'Rejected')`
    );

    const case4Rows = case4Query.rows;

    if (case4Rows.length > 0) {
      const case4TxnIds = case4Rows.map(r => r.transactionID);

      // Update Transaction
      await pool.query(
        `UPDATE "Transaction"
         SET "transactionStatus" = 'Cancelled',
             "cancellationReason" = 'system',
             "rejectionReason" = 'No response to pickup within deadline',
             "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::text[])`,
        [case4TxnIds]
      );

      // Update ItemStatus
      await pool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = 'Unresponded', "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::text[])`,
        [case4TxnIds]
      );

      // Insert notifications
      for (const row of case4Rows) {
        await pool.query(
          `INSERT INTO "Notification" ("sellerID", "message", "dateSent")
           VALUES ($1, $2, NOW())`,
          [
            row.sellerID,
            `🚨 Transaction ${row.transactionID} has been cancelled due to no response to pickup within the required time.`
          ]
        );
      }

      console.log(`✅ Case 4: Cancelled ${case4Rows.length} transactions (no pickup response).`);
    }

    // Return summary
    const totalCancelled = case3Rows.length + case4Rows.length;
    return {
      success: true,
      case3Cancelled: case3Rows.length,
      case4Cancelled: case4Rows.length,
      totalCancelled,
      cancelledTransactionIDs: [
        ...case3Rows.map(r => r.transactionID),
        ...case4Rows.map(r => r.transactionID)
      ]
    };

  } catch (error) {
    console.error('❌ Error in auto-cancellation:', error);
    throw error;
  }
};

/**
 * API ENDPOINT: Manually trigger auto-cancellation
 */
export const autoCancelOverdueTransactions = async (req: Request, res: Response) => {
  try {
    const result = await executeAutoCancellation();
    
    res.json({
      ...result,
      message: `Auto-cancellation complete: ${result.totalCancelled} transactions cancelled.`
    });

  } catch (error) {
    console.error('❌ Error in auto-cancellation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run auto-cancellation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
