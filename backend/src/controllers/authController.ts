import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database';

// Define JWT payload interface
interface JwtPayload {
  userId: string; // Changed to string for new userID format
  email: string | null; // Admins don't have email
  username: string;
  userType: string;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, username, phone } = req.body;

    // Validate required fields
    if (!email || !password || !name || !username) {
      return res.status(400).json({ message: 'Email, password, name, and username are required' });
    }

    // Check if email exists for sellers only
    const emailExists = await pool.query(
      'SELECT "userID" FROM users WHERE email = $1 AND user_type = $2',
      [email, 'seller']
    );

    if (emailExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists for sellers' });
    }

    // Check if username exists for sellers only
    const usernameExists = await pool.query(
      'SELECT "userID" FROM users WHERE username = $1 AND user_type = $2',
      [username, 'seller']
    );

    if (usernameExists.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists for sellers' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Get next seller_id from sequence and format as prefixed ID (S001, S002, etc.)
    const sellerIdResult = await pool.query("SELECT 'S' || LPAD(nextval('seller_id_seq')::text, 3, '0') as seller_id");
    const nextSellerId = sellerIdResult.rows[0].seller_id;

    // Create user (sellers only via registration)
    // Set status to ACTIVE for now (email verification will be implemented later)
    const result = await pool.query(
      `INSERT INTO users (email, password, name, username, phone, user_type, user_status, email_verified, can_change_password, seller_id)
       VALUES ($1, $2, $3, $4, $5, 'seller', 'ACTIVE', false, true, $6)
       RETURNING "userID", email, name, username, user_type, user_status, seller_id`,
      [email, hashedPassword, name, username, phone, nextSellerId]
    );

    // Store verification token (skip if auth_tokens table doesn't exist yet)
    try {
      await pool.query(
        `INSERT INTO auth_tokens (token, "userID", token_type, expires_at)
         VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '24 hours')`,
        [emailVerificationToken, result.rows[0].userID]
      );
    } catch (tokenError) {
      console.log('Auth tokens table not found, skipping token storage');
    }

    // TODO: Send verification email
    console.log(`Verification link: http://localhost:4200/verify-email/${emailVerificationToken}`);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    console.log('🔐 Login attempt:', { emailOrUsername });

    if (!emailOrUsername || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ message: 'Username/admin ID and password are required' });
    }

    // Find user by username, prefixed IDs (A001, B001, S001), or email
    // Check if input matches prefixed ID pattern (A001, B001, S001, etc.)
    const isPrefixedId = /^[ABS]\d+$/i.test(emailOrUsername);
    let result;

    if (isPrefixedId) {
      // Find by admin_id, buyer_id, or seller_id (all are prefixed now)
      result = await pool.query(
        `SELECT * FROM users
         WHERE UPPER(admin_id) = UPPER($1)
         OR UPPER(buyer_id) = UPPER($1)
         OR UPPER(seller_id) = UPPER($1)`,
        [emailOrUsername.toUpperCase()]
      );
    } else {
      // Find by username or email
      result = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR (email IS NOT NULL AND email = $1)',
        [emailOrUsername]
      );
    }

    if (result.rows.length === 0) {
      console.log('❌ User not found:', emailOrUsername);
      return res.status(401).json({ message: 'Invalid username or email.' });
    }

    const user = result.rows[0];
    console.log('👤 User found:', {
      username: user.username,
      admin_id: user.admin_id,
      user_type: user.user_type,
      user_status: user.user_status,
      has_email: !!user.email
    });

    // Check if account is active
    if (user.user_status !== 'ACTIVE') {
      console.log('❌ Account not active:', user.user_status);

      // Different messages for admins vs customers
      const isAdmin = user.user_type === 'admin' || user.user_type === 'superadmin';
      const message = isAdmin
        ? 'Your admin account is inactive. Please contact the Super Admin.'
        : (user.user_status === 'INACTIVE' ? 'Please verify your email first' : 'Account is blocked');

      return res.status(401).json({ message });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('❌ Invalid password for user:', user.username);
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    console.log('✅ Login successful for:', user.username || user.email);

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE "userID" = $1', [user.userID]);

    // Generate JWT - simplified approach
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    // Build payload
    const payload: JwtPayload = {
      userId: user.userID,
      email: user.email,
      username: user.username,
      userType: user.user_type
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' } as jwt.SignOptions);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.userID,
        email: user.email,
        name: user.name,
        username: user.username,
        userType: user.user_type,
        adminRole: user.admin_role || null,
        sellerId: user.seller_id || null,
        buyerId: user.buyer_id || null,
        adminId: user.admin_id || null,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const result = await pool.query('SELECT "userID" FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Update user with reset token
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE email = $2',
      [resetToken, email]
    );

    // TODO: Send email with reset link
    console.log(`Reset link: http://localhost:4200/reset-password/${resetToken}`);

    res.json({ message: 'Reset password email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid token
    const result = await pool.query(
      'SELECT "userID" FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE "userID" = $2',
      [hashedPassword, result.rows[0].userID]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  res.json({ message: 'Email verification not implemented yet' });
};

export const validateToken = async (req: Request, res: Response) => {
  // If we reach here, the token is valid (verified by middleware)
  res.json({
    valid: true,
    message: 'Token is valid'
  });
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id; // Now a string ID

    const result = await pool.query(
      'SELECT "userID", email, name, username, user_type, user_status, phone, last_login, created_at FROM users WHERE "userID" = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id; // Now a string ID
    const { name, username, phone } = req.body;

    // Check if username is being updated and if it's unique within the same user_type
    if (username !== undefined) {
      // First get the current user's type
      const currentUser = await pool.query(
        'SELECT user_type FROM users WHERE "userID" = $1',
        [userId]
      );

      if (currentUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userType = currentUser.rows[0].user_type;

      // Check if username exists for the same user_type (excluding current user)
      const existingUser = await pool.query(
        'SELECT "userID" FROM users WHERE username = $1 AND user_type = $2 AND "userID" != $3',
        [username, userType, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Username already exists. Please choose a different username.' });
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE "userID" = $${paramCount}
       RETURNING "userID", email, name, username, user_type, user_status, phone, last_login, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};