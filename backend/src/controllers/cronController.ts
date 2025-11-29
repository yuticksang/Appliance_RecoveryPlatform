import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Auto-cancel transactions that have passed their deadlines
 * Case 3: No response to offer within 14 days (responseDeadline)
 * Case 4: No response to pickup within 14 days (based on itemStatus)
 */
export const autoCancelOverdueTransactions = async (req: Request, res: Response) => {
  try {
    console.log('„ Running auto-cancellation check...');

    // Case 3: Cancel transactions where responseDeadline has passed
    // Status: "Awaiting Confirmation" and responseDeadline < NOW()
    const case3Result = await pool.query(
      `UPDATE "Transaction" t
       SET "transactionStatus" = 'Cancelled', "updatedAt" = NOW()
       WHERE t."transactionStatus" = 'Awaiting Confirmation'
       AND t."responseDeadline" IS NOT NULL
       AND t."responseDeadline" < NOW()
       RETURNING t."transactionID"`
    );

    // Update ItemStatus to "Unresponded" for Case 3
    if (case3Result.rows.length > 0) {
      const case3TxnIds = case3Result.rows.map(row => row.transactionID);
      await pool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = 'Unresponded', "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::varchar[])`,
        [case3TxnIds]
      );
      console.log(` Case 3: Cancelled ${case3Result.rows.length} transactions (no response to offer)`);
    }

    // Case 4: Cancel transactions where item is "Awaiting Pick Up" for more than 14 days
    // Get transactions where itemStatus is "Awaiting Pick Up" and updatedAt was more than 14 days ago
    const case4Result = await pool.query(
      `UPDATE "Transaction" t
       SET "transactionStatus" = 'Cancelled', "updatedAt" = NOW()
       FROM "ItemStatus" i
       WHERE t."transactionID" = i."transactionID"
       AND i."itemStatus" = 'Awaiting Pick Up'
       AND i."updatedAt" < NOW() - INTERVAL '14 days'
       AND t."transactionStatus" NOT IN ('Cancelled', 'Completed', 'Rejected')
       RETURNING t."transactionID"`
    );

    // Update ItemStatus to "Unresponded" for Case 4
    if (case4Result.rows.length > 0) {
      const case4TxnIds = case4Result.rows.map(row => row.transactionID);
      await pool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = 'Unresponded', "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::varchar[])`,
        [case4TxnIds]
      );
      console.log(` Case 4: Cancelled ${case4Result.rows.length} transactions (no pickup response)`);
    }

    const totalCancelled = case3Result.rows.length + case4Result.rows.length;

    res.json({
      success: true,
      message: `Auto-cancellation complete. ${totalCancelled} transactions cancelled.`,
      case3Count: case3Result.rows.length,
      case4Count: case4Result.rows.length,
      cancelledTransactions: [
        ...case3Result.rows.map(r => r.transactionID),
        ...case4Result.rows.map(r => r.transactionID)
      ]
    });
  } catch (error) {
    console.error(' Error in auto-cancellation:', error);
    res.status(500).json({
      message: 'Failed to run auto-cancellation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
