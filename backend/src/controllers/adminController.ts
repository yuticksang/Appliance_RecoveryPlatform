import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';

console.log('🔥🔥🔥 adminController.ts loaded! 🔥🔥🔥');

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT "userID", email, name, username, phone, user_type, user_status, admin_role, admin_id, buyer_id, seller_id, created_at FROM users ORDER BY admin_id ASC NULLS LAST, "userID" ASC'
    );

    console.log('👥 Fetched users:', result.rows.map(u => ({ userID: u.userID, username: u.username, admin_id: u.admin_id, user_type: u.user_type })));
    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Check if username is available for a specific user type
export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { user_type } = req.query; // Get user_type from query params

    if (!user_type) {
      return res.status(400).json({ message: 'user_type is required' });
    }

    const result = await pool.query(
      'SELECT "userID" FROM users WHERE username = $1 AND user_type = $2',
      [username, user_type]
    );

    res.json({ available: result.rows.length === 0 });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ message: 'Failed to check username' });
  }
};

// Create new user (admin or buyer)
export const createUser = async (req: Request, res: Response) => {
  try {
    console.log('📝 Create user request:', req.body);
    const { password, name, username, phone, user_type, admin_role } = req.body;

    // Validate required fields
    if (!password || !name || !username) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Password, name, and username are required' });
    }

    // Check if username already exists for this user_type
    const existingUser = await pool.query(
      'SELECT "userID" FROM users WHERE username = $1 AND user_type = $2',
      [username, user_type || 'admin']
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Username already exists for', user_type || 'admin', ':', username);
      return res.status(400).json({ message: 'Username already exists for this user type' });
    }

    // Check if email already exists for this user_type (if email is provided)
    if (req.body.email) {
      const existingEmail = await pool.query(
        'SELECT "userID" FROM users WHERE email = $1 AND user_type = $2',
        [req.body.email, user_type || 'admin']
      );

      if (existingEmail.rows.length > 0) {
        console.log('❌ Email already exists for', user_type || 'admin', ':', req.body.email);
        return res.status(400).json({ message: 'Email already exists for this user type' });
      }
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate appropriate ID based on user type
    let userId = null;
    let queryParams: any[];
    let queryFields: string;
    let queryValues: string;

    if (user_type === 'buyer') {
      // Get next buyer_id from sequence and format as prefixed ID (B001, B002, etc.)
      const buyerIdResult = await pool.query("SELECT 'B' || LPAD(nextval('buyer_id_seq')::text, 3, '0') as buyer_id");
      const nextBuyerId = buyerIdResult.rows[0].buyer_id;
      userId = nextBuyerId;

      queryFields = 'password, name, username, email, phone, user_type, user_status, buyer_id, created_at';
      queryValues = '$1, $2, $3, $4, $5, $6, $7, $8, NOW()';
      queryParams = [hashedPassword, name, username, req.body.email || null, phone || '', user_type, 'ACTIVE', nextBuyerId];
    } else {
      // Admin user - Get next admin_id from sequence and format as prefixed ID (A002, A003, etc.)
      const adminIdResult = await pool.query("SELECT 'A' || LPAD(nextval('admin_id_seq')::text, 3, '0') as admin_id");
      const nextAdminId = adminIdResult.rows[0].admin_id;
      userId = nextAdminId;

      queryFields = 'password, name, username, phone, user_type, user_status, admin_role, admin_id, created_at';
      queryValues = '$1, $2, $3, $4, $5, $6, $7, $8, NOW()';
      queryParams = [hashedPassword, name, username, phone || '', user_type || 'admin', 'ACTIVE', admin_role || 'ADMIN', nextAdminId];
    }

    // Create user
    console.log('💾 Inserting user into database...');
    const result = await pool.query(
      `INSERT INTO users (${queryFields})
       VALUES (${queryValues})
       RETURNING "userID", name, username, email, phone, user_type, user_status, admin_role, admin_id, buyer_id`,
      queryParams
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
    const { id } = req.params; // This is now userID (string)
    const { name, username, password, email, phone } = req.body;

    // Get current user's type
    const currentUser = await pool.query(
      'SELECT user_type FROM users WHERE "userID" = $1',
      [id]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userType = currentUser.rows[0].user_type;

    // Check if username is taken by another user of the same type
    const existingUser = await pool.query(
      'SELECT "userID" FROM users WHERE username = $1 AND user_type = $2 AND "userID" != $3',
      [username, userType, id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists for this user type' });
    }

    // Check if email is taken by another user of the same type (if email is provided)
    if (email !== undefined && email !== null && email !== '') {
      const existingEmail = await pool.query(
        'SELECT "userID" FROM users WHERE email = $1 AND user_type = $2 AND "userID" != $3',
        [email, userType, id]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ message: 'Email already exists for this user type' });
      }
    }

    // Build dynamic update fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }

    if (username) {
      updateFields.push(`username = $${paramCount++}`);
      updateValues.push(username);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(email || null);
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount++}`);
      updateValues.push(phone || '');
    }

    // If password is provided, hash it and add to update
    if (password && password.trim() !== '') {
      console.log('🔒 Updating password for user:', id);
      const hashedPassword = await bcrypt.hash(password, 12);
      updateFields.push(`password = $${paramCount++}`);
      updateValues.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Add the ID as the last parameter
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE "userID" = $${paramCount} RETURNING "userID", name, username, email, phone`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User updated successfully');
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
    const { id } = req.params; // This is now userID (string)
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check if user is superadmin
    const userCheck = await pool.query(
      'SELECT user_type FROM users WHERE "userID" = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userCheck.rows[0].user_type === 'superadmin') {
      return res.status(403).json({ message: 'Superadmin accounts cannot be deactivated' });
    }

    const result = await pool.query(
      'UPDATE users SET user_status = $1 WHERE "userID" = $2 RETURNING "userID", user_status',
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
    const { id } = req.params; // This is now userID (string)

    // Check user type before deleting
    const userCheck = await pool.query(
      'SELECT user_type FROM users WHERE "userID" = $1',
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
      'DELETE FROM users WHERE "userID" = $1 RETURNING "userID"',
      [id]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};
