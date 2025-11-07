import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

// ==================== ADDRESS CRUD ====================

export const getAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await pool.query(
      `SELECT id, name as "receiverName", phone as "phoneNum", state, city, zip_code as "zipCode",
       pickup_address as "pickupAddress"
       FROM pickup_address WHERE seller_id = $1 ORDER BY id DESC`,
      [userId]
    );

    // Transform database column names to frontend format
    const addresses = result.rows.map(row => ({
      id: row.id,
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
    const userId = parseInt(req.params.userId);
    const { name, phone, state, city, zip, pickup } = req.body;

    if (!name || !phone || !state || !city || !zip || !pickup) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const result = await pool.query(
      `INSERT INTO pickup_address (seller_id, name, phone, state, city, zip_code, pickup_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name as "receiverName", phone as "phoneNum", state, city, zip_code as "zipCode",
       pickup_address as "pickupAddress"`,
      [userId, name, phone, state, city, zip, pickup]
    );

    const address = {
      id: result.rows[0].id,
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
    const userId = parseInt(req.params.userId);
    const addressId = parseInt(req.params.addressId);
    const { name, phone, state, city, zip, pickup } = req.body;

    const result = await pool.query(
      `UPDATE pickup_address
       SET name = $1, phone = $2, state = $3, city = $4, zip_code = $5, pickup_address = $6
       WHERE id = $7 AND seller_id = $8
       RETURNING id, name as "receiverName", phone as "phoneNum", state, city, zip_code as "zipCode",
       pickup_address as "pickupAddress"`,
      [name, phone, state, city, zip, pickup, addressId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const address = {
      id: result.rows[0].id,
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
    const userId = parseInt(req.params.userId);
    const addressId = parseInt(req.params.addressId);

    const result = await pool.query(
      'DELETE FROM pickup_address WHERE id = $1 AND seller_id = $2 RETURNING id',
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
    const userId = parseInt(req.params.userId);

    const result = await pool.query(
      `SELECT id, bank_name as "bankName", account_holder_name as "holderName", account_number as "accountNumber"
       FROM seller_bank WHERE seller_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    const bank = {
      id: result.rows[0].id,
      bankName: result.rows[0].bankName,
      holderName: result.rows[0].holderName,
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
    const userId = parseInt(req.params.userId);
    const { bankName, holderName, accountNumber } = req.body;

    if (!bankName || !holderName || !accountNumber) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if bank details already exist
    const existing = await pool.query(
      'SELECT id FROM seller_bank WHERE seller_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bank details already exist. Use update instead.' });
    }

    const result = await pool.query(
      `INSERT INTO seller_bank (seller_id, bank_name, account_holder_name, account_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id, bank_name as "bankName", account_holder_name as "holderName", account_number as "accountNumber"`,
      [userId, bankName, holderName, accountNumber]
    );

    const bank = {
      id: result.rows[0].id,
      bankName: result.rows[0].bankName,
      holderName: result.rows[0].holderName,
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
    const userId = parseInt(req.params.userId);
    const { bankName, holderName, accountNumber } = req.body;

    const result = await pool.query(
      `UPDATE seller_bank
       SET bank_name = $1, account_holder_name = $2, account_number = $3
       WHERE seller_id = $4
       RETURNING id, bank_name as "bankName", account_holder_name as "holderName", account_number as "accountNumber"`,
      [bankName, holderName, accountNumber, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    const bank = {
      id: result.rows[0].id,
      bankName: result.rows[0].bankName,
      holderName: result.rows[0].holderName,
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
    const userId = parseInt(req.params.userId);

    const result = await pool.query(
      'DELETE FROM seller_bank WHERE seller_id = $1 RETURNING id',
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
