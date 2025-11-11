import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

// ==================== ADDRESS CRUD ====================

export const getAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // Now a string ID

    const result = await pool.query(
      `SELECT "addressID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress"
       FROM "PickupAddress" WHERE "sellerID" = $1 ORDER BY "addressID" DESC`,
      [userId]
    );

    // Transform database column names to frontend format
    const addresses = result.rows.map(row => ({
      id: row.addressID,
      name: row.receiverName,
      phone: row.phoneNum,
      state: row.state,
      city: row.city,
      zip: row.zipCode,
      pickup: row.pickupAddress
    }));

    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // Now a string ID
    const { name, phone, state, city, zip, pickup } = req.body;

    if (!name || !phone || !state || !city || !zip || !pickup) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const result = await pool.query(
      `INSERT INTO "PickupAddress" ("sellerID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING "addressID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress"`,
      [userId, name, phone, state, city, zip, pickup]
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
    const userId = req.params.userId; // Now a string ID
    const addressId = req.params.addressId; // Now a string ID
    const { name, phone, state, city, zip, pickup } = req.body;

    const result = await pool.query(
      `UPDATE "PickupAddress"
       SET "receiverName" = $1, "phoneNum" = $2, state = $3, city = $4, "zipCode" = $5, "pickupAddress" = $6
       WHERE "addressID" = $7 AND "sellerID" = $8
       RETURNING "addressID", "receiverName", "phoneNum", state, city, "zipCode", "pickupAddress"`,
      [name, phone, state, city, zip, pickup, addressId, userId]
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
    const userId = req.params.userId; // Now a string ID
    const addressId = req.params.addressId; // Now a string ID

    const result = await pool.query(
      'DELETE FROM "PickupAddress" WHERE "addressID" = $1 AND "sellerID" = $2 RETURNING "addressID"',
      [addressId, userId]
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

// ==================== BANK CRUD ====================

export const getBankDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // Now a string ID

    const result = await pool.query(
      `SELECT "bankID", "bankName", "accountHolderName", "accountNumber"
       FROM "SellerBank" WHERE "sellerID" = $1`,
      [userId]
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
    console.error('Get bank details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createBankDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId; // Now a string ID
    const { bankName, holderName, accountNumber } = req.body;

    if (!bankName || !holderName || !accountNumber) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if bank details already exist
    const existing = await pool.query(
      'SELECT "bankID" FROM "SellerBank" WHERE "sellerID" = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bank details already exist. Use update instead.' });
    }

    const result = await pool.query(
      `INSERT INTO "SellerBank" ("sellerID", "bankName", "accountHolderName", "accountNumber")
       VALUES ($1, $2, $3, $4)
       RETURNING "bankID", "bankName", "accountHolderName", "accountNumber"`,
      [userId, bankName, holderName, accountNumber]
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
    const userId = req.params.userId; // Now a string ID
    const { bankName, holderName, accountNumber } = req.body;

    const result = await pool.query(
      `UPDATE "SellerBank"
       SET "bankName" = $1, "accountHolderName" = $2, "accountNumber" = $3
       WHERE "sellerID" = $4
       RETURNING "bankID", "bankName", "accountHolderName", "accountNumber"`,
      [bankName, holderName, accountNumber, userId]
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
    const userId = req.params.userId; // Now a string ID

    const result = await pool.query(
      'DELETE FROM "SellerBank" WHERE "sellerID" = $1 RETURNING "bankID"',
      [userId]
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
