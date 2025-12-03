import express from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import dbPool from '../config/database';

const router = express.Router();

/**
 * Get notifications for current user (SELLERS ONLY) and mark them as shown
 */
router.get('/unread', verifyToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    console.log('📢 Fetching notifications for user:', authUser.userId, 'userType:', authUser.userType);

    // Only allow sellers to get notifications
    if (authUser.userType !== 'seller') {
      console.log('❌ Rejected notification request - user is not a seller:', authUser.userType);
      return res.json([]);
    }

    let result: any = { rows: [] };
    
    // Get the seller_id from users table
    const sellerQuery = await dbPool.query(
      `SELECT seller_id FROM users WHERE "userID" = $1 AND user_type = 'seller'`,
      [authUser.userId]
    );
    
    if (sellerQuery.rows.length > 0 && sellerQuery.rows[0].seller_id) {
      const sellerId = sellerQuery.rows[0].seller_id;
      console.log('📢 Found seller_id:', sellerId, 'for user:', authUser.userId);
      
      // ✅ Fix: Get unshown notifications without aliases first
      const selectResult = await dbPool.query(
        `SELECT "notificationID", "sellerID", "message", "dateSent"
         FROM "Notification"
         WHERE "sellerID" = $1 AND ("isShown" = false OR "isShown" IS NULL)
         ORDER BY "dateSent" DESC`,
        [sellerId]
      );
      
      console.log('📢 Raw query result:', selectResult.rows); // Debug log
      
      // Mark notifications as shown if any exist
      if (selectResult.rows.length > 0) {
        const notificationIds = selectResult.rows.map(row => row.notificationID);
        console.log('📢 Notification IDs to mark as shown:', notificationIds); // Debug log
        
        await dbPool.query(
          `UPDATE "Notification"
           SET "isShown" = true, "shownAt" = NOW()
           WHERE "notificationID" = ANY($1::varchar[])`,
          [notificationIds]
        );
        console.log(`📢 Found ${selectResult.rows.length} new notifications and marked as shown for seller ${sellerId}`);
      } else {
        console.log(`📢 No new notifications found for seller ${sellerId}`);
      }
      
      result = selectResult;
      
    } else {
      console.log('⚠️ No seller_id found for user:', authUser.userId);
    }
    
    // ✅ Fix: Use the actual column names from the database
    const transformedNotifications = result.rows.map((row: any) => {
      console.log('📢 Processing notification row:', row); // Debug log
      
      return {
        id: row.notificationID ? row.notificationID.toString() : 'unknown', // ✅ Fix: Use notificationID
        userID: authUser.userId,
        type: 'system_cancellation',
        title: 'Transaction Cancelled by System',
        message: row.message || 'No message',
        relatedID: null,
        isRead: false,
        createdAt: row.dateSent || new Date().toISOString()
      };
    });

    console.log('📢 Transformed notifications:', transformedNotifications); // Debug log
    res.json(transformedNotifications);
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;