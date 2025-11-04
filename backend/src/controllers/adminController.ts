import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';

console.log('🔥🔥🔥 adminController.ts loaded! 🔥🔥🔥');

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, username, phone, user_type, user_status, admin_role, admin_id, created_at FROM users ORDER BY admin_id ASC NULLS LAST, id ASC'
    );

    console.log('👥 Fetched users:', result.rows.map(u => ({ id: u.id, username: u.username, admin_id: u.admin_id, user_type: u.user_type })));
    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Check if username is available
export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    res.json({ available: result.rows.length === 0 });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ message: 'Failed to check username' });
  }
};

// Create new admin user
export const createUser = async (req: Request, res: Response) => {
  try {
    console.log('📝 Create user request:', req.body);
    const { password, name, username, phone, user_type, admin_role } = req.body;

    // Validate required fields
    if (!password || !name || !username) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Password, name, and username are required' });
    }

    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Username already exists:', username);
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get next admin_id from sequence and format as prefixed ID (A002, A003, etc.)
    const adminIdResult = await pool.query("SELECT 'A' || LPAD(nextval('admin_id_seq')::text, 3, '0') as admin_id");
    const nextAdminId = adminIdResult.rows[0].admin_id;

    // Create user without email
    console.log('💾 Inserting user into database...');
    const result = await pool.query(
      `INSERT INTO users (password, name, username, phone, user_type, user_status, admin_role, admin_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, name, username, user_type, user_status, admin_role, admin_id`,
      [hashedPassword, name, username, phone || '', user_type || 'admin', 'ACTIVE', admin_role || 'ADMIN', nextAdminId]
    );

    console.log('✅ User created successfully:', result.rows[0]);
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, username, password } = req.body;

    // Check if username is taken by another user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // If password is provided, hash it and update
    if (password && password.trim() !== '') {
      console.log('🔒 Updating password for user:', id);
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await pool.query(
        'UPDATE users SET name = $1, username = $2, password = $3 WHERE id = $4 RETURNING id, name, username',
        [name, username, hashedPassword, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('✅ User and password updated successfully');
      return res.json({
        message: 'User and password updated successfully',
        user: result.rows[0]
      });
    }

    // Otherwise just update name and username
    const result = await pool.query(
      'UPDATE users SET name = $1, username = $2 WHERE id = $3 RETURNING id, name, username',
      [name, username, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// Update user status
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check if user is superadmin
    const userCheck = await pool.query(
      'SELECT user_type FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userCheck.rows[0].user_type === 'superadmin') {
      return res.status(403).json({ message: 'Superadmin accounts cannot be deactivated' });
    }

    const result = await pool.query(
      'UPDATE users SET user_status = $1 WHERE id = $2 RETURNING id, user_status',
      [status, id]
    );

    res.json({
      message: 'User status updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check user type before deleting
    const userCheck = await pool.query(
      'SELECT user_type FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userType = userCheck.rows[0].user_type;

    // Prevent deletion of admin and superadmin accounts
    if (userType === 'admin' || userType === 'superadmin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted. Please deactivate instead.' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

