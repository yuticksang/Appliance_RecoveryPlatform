import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';

// ==================== ADDRESS CRUD ====================

export const getAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // This is userID (U001, U002, etc.)

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    // Now get addresses using seller_id
    const result = await pool.query(
      `SELECT "addressID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress", "isDefault", "status"
       FROM "PickupAddress" WHERE "sellerID" = $1 AND status = 'ACTIVE' ORDER BY "addressID" DESC`,
      [sellerId]
    );

    // Transform database column names to frontend format
    const addresses = result.rows.map(row => ({
      id: row.addressID,
      name: row.receiverName,
      phone: row.phoneNum,
      state: row.state,
      city: row.city,
      zip: row.zipCode,
      pickup: row.pickupAddress,
      isDefault: row.isDefault
    }));

    console.log('📍 Returning addresses:', addresses);
    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // This is userID (U001, U002, etc.)
    const { name, phone, state, city, zip, pickup } = req.body;

    if (!name || !phone || !state || !city || !zip || !pickup) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    const result = await pool.query(
      `INSERT INTO "PickupAddress" ("sellerID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       RETURNING "addressID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress"`,
      [sellerId, name, phone, state, city, zip, pickup]
    );

    const address = {
      id: result.rows[0].addressID,
      name: result.rows[0].receiverName,
      phone: result.rows[0].phoneNum,
      state: result.rows[0].state,
      city: result.rows[0].city,
      zip: result.rows[0].zipCode,
      pickup: result.rows[0].pickupAddress
    };

    res.status(201).json(address);
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  try {
    
    console.log('RAW BODY:', req.body); // ← MUST SHOW PAYLOAD

    const userId = req.params.userId; // This is userID (U001, U002, etc.)
    const addressId = req.params.addressId; // String ID
    const { name, phone, state, city, zip, pickup } = req.body;

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    const result = await pool.query(
      `UPDATE "PickupAddress"
       SET "receiverName" = $1, "phoneNum" = $2, state = $3, city = $4, "zipCode" = $5, "pickupAddress" = $6
       WHERE "addressID" = $7 AND "sellerID" = $8
       RETURNING "addressID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress"`,
      [name, phone, state, city, zip, pickup, addressId, sellerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const address = {
      id: result.rows[0].addressID,
      name: result.rows[0].receiverName,
      phone: result.rows[0].phoneNum,
      state: result.rows[0].state,
      city: result.rows[0].city,
      zip: result.rows[0].zipCode,
      pickup: result.rows[0].pickupAddress
    };

    res.json(address);
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // This is userID (U001, U002, etc.)
    const addressId = req.params.addressId; // String ID

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    // Soft delete: Set status to INACTIVE instead of deleting the record
    const result = await pool.query(
      `UPDATE "PickupAddress"
       SET status = 'INACTIVE'
       WHERE "addressID" = $1 AND "sellerID" = $2
       RETURNING "addressID"`,
      [addressId, sellerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/addresses/:userId/:addressId/default
export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
  const { userId, addressId } = req.params;

  try {
    const seller = await pool.query(
      'SELECT "seller_id" FROM "users" WHERE "userID" = $1',
      [userId]
    );
    if (seller.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const sellerId = seller.rows[0].seller_id;

    // Verify address exists
    const check = await pool.query(
      'SELECT 1 FROM "PickupAddress" WHERE "addressID" = $1 AND "sellerID" = $2',
      [addressId, sellerId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Reset all
    await pool.query(
      'UPDATE "PickupAddress" SET "isDefault" = false WHERE "sellerID" = $1',
      [sellerId]
    );

    // Set default
    const result = await pool.query(
      'UPDATE "PickupAddress" SET "isDefault" = true WHERE "addressID" = $1 AND "sellerID" = $2 RETURNING *',
      [addressId, sellerId]
    );

    res.json({ success: true, address: result.rows[0] });
  } catch (err) {
    console.error('Set default error:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    res.status(500).json({ error: message });
  }
};

// ==================== BANK CRUD ====================

export const getBankDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // This is userID (U001, U002, etc.)

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    const result = await pool.query(
      `SELECT "bankID", "bankName", "accountHolderName", "accountNumber"
       FROM "SellerBank" WHERE "sellerID" = $1`,
      [sellerId]
    );

    if (result.rows.length === 0) {
      // Return null instead of 404 when no bank details exist yet
      return res.json(null);
    }

    const bank = {
      id: result.rows[0].bankID,
      bankName: result.rows[0].bankName,
      holderName: result.rows[0].accountHolderName,
      accountNumber: result.rows[0].accountNumber
    };

    res.json(bank);
  } catch (error) {
    console.error('Get bank details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createBankDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // This is userID (U001, U002, etc.)
    const { bankName, holderName, accountNumber } = req.body;

    if (!bankName || !holderName || !accountNumber) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    // Check if bank details already exist
    const existing = await pool.query(
      'SELECT "bankID" FROM "SellerBank" WHERE "sellerID" = $1',
      [sellerId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bank details already exist. Use update instead.' });
    }

    const result = await pool.query(
      `INSERT INTO "SellerBank" ("sellerID", "bankName", "accountHolderName", "accountNumber")
       VALUES ($1, $2, $3, $4)
       RETURNING "bankID", "bankName", "accountHolderName", "accountNumber"`,
      [sellerId, bankName, holderName, accountNumber]
    );

    const bank = {
      id: result.rows[0].bankID,
      bankName: result.rows[0].bankName,
      holderName: result.rows[0].accountHolderName,
      accountNumber: result.rows[0].accountNumber
    };

    res.status(201).json(bank);
  } catch (error) {
    console.error('Create bank details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBankDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // This is userID (U001, U002, etc.)
    const { bankName, holderName, accountNumber } = req.body;

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    const result = await pool.query(
      `UPDATE "SellerBank"
       SET "bankName" = $1, "accountHolderName" = $2, "accountNumber" = $3
       WHERE "sellerID" = $4
       RETURNING "bankID", "bankName", "accountHolderName", "accountNumber"`,
      [bankName, holderName, accountNumber, sellerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    const bank = {
      id: result.rows[0].bankID,
      bankName: result.rows[0].bankName,
      holderName: result.rows[0].accountHolderName,
      accountNumber: result.rows[0].accountNumber
    };

    res.json(bank);
  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBankDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // This is userID (U001, U002, etc.)

    // First, get the seller_id from the users table
    const userResult = await pool.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].seller_id) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const sellerId = userResult.rows[0].seller_id;

    const result = await pool.query(
      'DELETE FROM "SellerBank" WHERE "sellerID" = $1 RETURNING "bankID"',
      [sellerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    res.json({ message: 'Bank details deleted successfully' });
  } catch (error) {
    console.error('Delete bank details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
