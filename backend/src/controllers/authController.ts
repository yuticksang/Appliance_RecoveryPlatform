import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database';
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService';

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

    // Store verification token
    await pool.query(
      `INSERT INTO auth_tokens (token, "userID", token_type, expires_at)
       VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '24 hours')`,
      [emailVerificationToken, result.rows[0].userID]
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, name, emailVerificationToken);
      console.log(`✅ Verification email sent to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Don't fail registration if email fails
      console.log(`Verification link (for testing): ${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email/${emailVerificationToken}`);
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
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

    // Handle multiple users with same email/username
    // Check password against all matching accounts
    let user = null;
    for (const potentialUser of result.rows) {
      const isPasswordValid = await bcrypt.compare(password, potentialUser.password);
      if (isPasswordValid) {
        user = potentialUser;
        break;
      }
    }

    if (!user) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }
    console.log('👤 User found:', {
      username: user.username,
      admin_id: user.admin_id,
      user_type: user.user_type,
      user_status: user.user_status,
      has_email: !!user.email
    });

    // Check if email is verified (only for sellers with email/password login)
    if (user.user_type === 'seller' && !user.email_verified && user.can_change_password) {
      console.log('❌ Email not verified');
      return res.status(401).json({
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        emailNotVerified: true,
        email: user.email
      });
    }

    // Check if account is active
    if (user.user_status !== 'ACTIVE') {
      console.log('❌ Account not active:', user.user_status);

      // Different messages for admins vs customers
      const isAdmin = user.user_type === 'admin' || user.user_type === 'superadmin';
      const message = isAdmin
        ? 'Your admin account is inactive. Please contact the Super Admin.'
        : 'Your account has been deactivated. Please contact support.';

      return res.status(401).json({ message });
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

    console.log('🔐 Password reset requested for:', email);

    // Check if user exists
    const result = await pool.query(
      'SELECT "userID", name, email FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store reset token in auth_tokens table
    await pool.query(
      `INSERT INTO auth_tokens (token, "userID", token_type, expires_at)
       VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '1 hour')
       ON CONFLICT (token) DO UPDATE SET expires_at = NOW() + INTERVAL '1 hour'`,
      [resetToken, user.userID]
    );

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
      console.log(`✅ Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      console.log(`Reset link (for testing): ${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password/${resetToken}`);
    }

    res.json({
      message: 'If an account with that email exists, we have sent a password reset link.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    console.log('🔐 Password reset attempt with token');

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find valid token in auth_tokens table
    const tokenResult = await pool.query(
      `SELECT "userID" FROM auth_tokens
       WHERE token = $1 AND token_type = 'password_reset' AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      console.log('❌ Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link. Please request a new one.'
      });
    }

    const userId = tokenResult.rows[0].userID;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1 WHERE "userID" = $2',
      [hashedPassword, userId]
    );

    // Delete the used token
    await pool.query(
      'DELETE FROM auth_tokens WHERE token = $1',
      [token]
    );

    console.log('✅ Password reset successful for user:', userId);

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    console.log('🔍 Verifying email with token:', token);

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT "userID", token_type, expires_at
       FROM auth_tokens
       WHERE token = $1 AND token_type = 'email_verification' AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      console.log('❌ Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.'
      });
    }

    const userId = tokenResult.rows[0].userID;

    // Update user as verified
    await pool.query(
      'UPDATE users SET email_verified = true WHERE "userID" = $1',
      [userId]
    );

    // Delete the used token
    await pool.query(
      'DELETE FROM auth_tokens WHERE token = $1',
      [token]
    );

    console.log('✅ Email verified successfully for user:', userId);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
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

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    console.log('📧 Resend verification requested for:', email);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists and is not verified
    const userResult = await pool.query(
      `SELECT "userID", email, name, email_verified
       FROM users
       WHERE email = $1 AND user_type = 'seller'`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists or not
      return res.json({
        message: 'If an unverified account exists with that email, we have sent a new verification link.'
      });
    }

    const user = userResult.rows[0];

    // If already verified, inform the user
    if (user.email_verified) {
      return res.status(400).json({
        message: 'This email is already verified. You can log in now.'
      });
    }

    // Delete any existing verification tokens for this user
    await pool.query(
      `DELETE FROM auth_tokens
       WHERE "userID" = $1 AND token_type = 'email_verification'`,
      [user.userID]
    );

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store new token
    await pool.query(
      `INSERT INTO auth_tokens (token, "userID", token_type, expires_at)
       VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '24 hours')`,
      [verificationToken, user.userID]
    );

    // Send new verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      console.log(`✅ New verification email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      console.log(`Verification link (for testing): ${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email/${verificationToken}`);
    }

    res.json({
      message: 'If an unverified account exists with that email, we have sent a new verification link.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    console.log('🔐 Google login attempt with token:', idToken ? 'Token received' : 'No token');

    if (!idToken) {
      return res.status(400).json({ message: 'ID token is required' });
    }

    // Initialize Google OAuth client with your Client ID
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    console.log('🔑 Verifying Google token with Client ID:', process.env.GOOGLE_CLIENT_ID);

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('✅ Google token verified successfully:', { email: payload?.email, name: payload?.name });

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const { email, name, sub: googleId, email_verified } = payload;

    console.log('🔐 Google login attempt:', { email, name });

    // Check if user exists with this email
    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND user_type = $2',
      [email, 'seller']
    );

    let user;

    if (userResult.rows.length === 0) {
      // User doesn't exist, create new user
      console.log('📝 Creating new user from Google login');

      // Generate username from email or name
      const baseUsername = (email.split('@')[0] || name?.toLowerCase().replace(/\s+/g, '') || 'user').substring(0, 20);
      let username = baseUsername;
      let counter = 1;

      // Check if username is unique
      while (true) {
        const usernameExists = await pool.query(
          'SELECT "userID" FROM users WHERE username = $1 AND user_type = $2',
          [username, 'seller']
        );

        if (usernameExists.rows.length === 0) break;
        username = `${baseUsername}${counter++}`;
      }

      // Get next seller_id
      const sellerIdResult = await pool.query("SELECT 'S' || LPAD(nextval('seller_id_seq')::text, 3, '0') as seller_id");
      const nextSellerId = sellerIdResult.rows[0].seller_id;

      // Create user without password (Google auth)
      userResult = await pool.query(
        `INSERT INTO users (email, name, username, user_type, user_status, email_verified, can_change_password, seller_id, google_id)
         VALUES ($1, $2, $3, 'seller', 'ACTIVE', $4, false, $5, $6)
         RETURNING "userID", email, name, username, user_type, user_status, seller_id`,
        [email, name, username, email_verified || false, nextSellerId, googleId]
      );

      user = userResult.rows[0];
    } else {
      // User exists, update last login
      user = userResult.rows[0];

      // Update google_id if not set
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = $1 WHERE "userID" = $2',
          [googleId, user.userID]
        );
      }

      console.log('✅ Existing user logged in with Google');
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE "userID" = $1',
      [user.userID]
    );

    // Generate JWT token
    const jwtPayload: JwtPayload = {
      userId: user.userID,
      email: user.email,
      username: user.username,
      userType: user.user_type
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string, {
      expiresIn: '7d'
    });

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user.userID,
        email: user.email,
        name: user.name,
        username: user.username,
        userType: user.user_type,
        sellerId: user.seller_id || null,
        buyerId: user.buyer_id || null,
        adminId: user.admin_id || null,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Google login failed', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};