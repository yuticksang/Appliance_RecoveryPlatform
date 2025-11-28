import { Request, Response } from 'express';
import pool from '../config/database';

// Get all buyer appliances for the logged-in buyer
export const getBuyerAppliances = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId; // Get user ID from auth middleware

    console.log('🔍 getBuyerAppliances called');
    console.log('   User from token:', (req as any).user);
    console.log('   User ID:', userId);

    if (!userId) {
      console.log('❌ No user ID found - Unauthorized');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // First, get the buyer_id from the users table
    const userQuery = await pool.query(
      'SELECT buyer_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const buyerId = userQuery.rows[0].buyer_id;
    console.log('   Buyer ID:', buyerId);

    if (!buyerId) {
      console.log('❌ User is not a buyer');
      return res.status(403).json({ message: 'User is not a buyer' });
    }

    const query = `
      SELECT
        ba."buyerID",
        ba."applianceID",
        ba."basePrice",
        ba."status",
        a."modelCode",
        a."modelName",
        a."image_url",
        c."categoryName",
        b."brandName"
      FROM "BuyerAppliance" ba
      JOIN "Appliance" a ON ba."applianceID" = a."applianceID"
      JOIN "Category" c ON a."categoryID" = c."categoryID"
      JOIN "Brand" b ON a."brandID" = b."brandID"
      WHERE ba."buyerID" = $1
      ORDER BY a."modelCode" ASC
    `;

    console.log('   Executing query with buyerID:', buyerId);
    const result = await pool.query(query, [buyerId]);

    console.log('✅ Query result:', result.rows.length, 'appliances found');
    console.log('   Data:', result.rows);

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching buyer appliances:', error);
    res.status(500).json({ message: 'Failed to fetch buyer appliances' });
  }
};

// Add a new appliance to buyer's list
export const addBuyerAppliance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { applianceID, basePrice } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get buyer_id from users table
    const userQuery = await pool.query(
      'SELECT buyer_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const buyerId = userQuery.rows[0].buyer_id;

    if (!buyerId) {
      return res.status(403).json({ message: 'User is not a buyer' });
    }

    if (!applianceID || !basePrice || basePrice <= 0) {
      return res.status(400).json({ message: 'Appliance ID and valid base price are required' });
    }

    // Check if appliance already exists for this buyer
    const checkQuery = `
      SELECT * FROM "BuyerAppliance"
      WHERE "buyerID" = $1 AND "applianceID" = $2
    `;
    const checkResult = await pool.query(checkQuery, [buyerId, applianceID]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ message: 'This appliance is already in your list' });
    }

    // Insert new buyer appliance
    const insertQuery = `
      INSERT INTO "BuyerAppliance" ("buyerID", "applianceID", "basePrice")
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [buyerId, applianceID, basePrice]);

    res.status(201).json({
      message: 'Appliance added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding buyer appliance:', error);
    res.status(500).json({ message: 'Failed to add appliance' });
  }
};

// Update base price for a buyer appliance
export const updateBuyerAppliance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { applianceID } = req.params;
    const { basePrice } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get buyer_id from users table
    const userQuery = await pool.query(
      'SELECT buyer_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const buyerId = userQuery.rows[0].buyer_id;

    if (!buyerId) {
      return res.status(403).json({ message: 'User is not a buyer' });
    }

    if (!basePrice || basePrice <= 0) {
      return res.status(400).json({ message: 'Valid base price is required' });
    }

    const query = `
      UPDATE "BuyerAppliance"
      SET "basePrice" = $1
      WHERE "buyerID" = $2 AND "applianceID" = $3
      RETURNING *
    `;

    const result = await pool.query(query, [basePrice, buyerId, applianceID]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appliance not found in your list' });
    }

    res.json({
      message: 'Base price updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating buyer appliance:', error);
    res.status(500).json({ message: 'Failed to update appliance' });
  }
};

// Toggle status of a buyer appliance
export const toggleBuyerApplianceStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { applianceID } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get buyer_id from users table
    const userQuery = await pool.query(
      'SELECT buyer_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const buyerId = userQuery.rows[0].buyer_id;

    if (!buyerId) {
      return res.status(403).json({ message: 'User is not a buyer' });
    }

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required (ACTIVE or INACTIVE)' });
    }

    const query = `
      UPDATE "BuyerAppliance"
      SET "status" = $1
      WHERE "buyerID" = $2 AND "applianceID" = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, buyerId, applianceID]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appliance not found in your list' });
    }

    res.json({
      message: `Appliance ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling buyer appliance status:', error);
    res.status(500).json({ message: 'Failed to toggle appliance status' });
  }
};

// Delete a buyer appliance
export const deleteBuyerAppliance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { applianceID } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get buyer_id from users table
    const userQuery = await pool.query(
      'SELECT buyer_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const buyerId = userQuery.rows[0].buyer_id;

    if (!buyerId) {
      return res.status(403).json({ message: 'User is not a buyer' });
    }

    const query = `
      DELETE FROM "BuyerAppliance"
      WHERE "buyerID" = $1 AND "applianceID" = $2
      RETURNING *
    `;

    const result = await pool.query(query, [buyerId, applianceID]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appliance not found in your list' });
    }

    res.json({ message: 'Appliance removed successfully' });
  } catch (error) {
    console.error('Error deleting buyer appliance:', error);
    res.status(500).json({ message: 'Failed to remove appliance' });
  }
};
