import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

// =====================================================
// APPLIANCE MANAGEMENT
// =====================================================

// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT "categoryID", "categoryName", description, count, status, created_at FROM "Category" ORDER BY "categoryName" ASC'
    );

    console.log('📂 Fetched categories:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// Get all brands
export const getAllBrands = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT "brandID", "brandName", description, count, status, created_at FROM "Brand" ORDER BY "brandName" ASC'
    );

    console.log('🏷️ Fetched brands:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all brands error:', error);
    res.status(500).json({ message: 'Failed to fetch brands' });
  }
};

// Get all appliances with category and brand names
export const getAllAppliances = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        a."applianceID",
        a."categoryID",
        a."brandID",
        a."modelCode",
        a."modelName",
        a.description,
        a.image_url,
        a.status,
        a.created_at,
        c."categoryName",
        b."brandName"
      FROM "Appliance" a
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      ORDER BY a."applianceID" ASC`
    );

    console.log('📱 Fetched appliances:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all appliances error:', error);
    res.status(500).json({ message: 'Failed to fetch appliances' });
  }
};

// Create new appliance
export const createAppliance = async (req: Request, res: Response) => {
  try {
    const { categoryID, brandID, modelCode, modelName, description } = req.body;
    const imageFile = (req as any).file;

    console.log('📝 Create appliance request:', { categoryID, brandID, modelCode, modelName, hasFile: !!imageFile });

    // Validate required fields
    if (!categoryID || !brandID || !modelCode || !modelName) {
      return res.status(400).json({ message: 'Category, Brand, Model Code, and Model Name are required' });
    }

    // Check if model code already exists
    const existing = await pool.query(
      'SELECT "applianceID" FROM "Appliance" WHERE "modelCode" = $1',
      [modelCode]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Model code already exists' });
    }

    // Upload image to Supabase Storage if file was uploaded
    let imageUrl = null;
    if (imageFile) {
      const fileExt = imageFile.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
      const filePath = `appliances/${modelCode}/${fileName}`;

      console.log(`📸 Uploading appliance image to Supabase: ${filePath}`);

      const { error: uploadError } = await supabase.storage
        .from('appliance-images')
        .upload(filePath, imageFile.buffer, {
          contentType: imageFile.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('appliance-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
      console.log(`✅ Appliance image uploaded to Supabase: ${imageUrl}`);
    }

    const result = await pool.query(
      `INSERT INTO "Appliance" ("categoryID", "brandID", "modelCode", "modelName", description, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [categoryID, brandID, modelCode, modelName, description || null, imageUrl]
    );

    console.log('✅ Appliance created:', result.rows[0]);
    res.status(201).json({
      message: 'Appliance created successfully',
      appliance: result.rows[0]
    });
  } catch (error) {
    console.error('Create appliance error:', error);
    res.status(500).json({ message: 'Failed to create appliance' });
  }
};

// Update appliance
export const updateAppliance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { modelCode, modelName, categoryID, brandID, description, removeImage } = req.body;
    const imageFile = (req as any).file;
    
    console.log('🔄 Update appliance request:', { 
      id, modelCode, modelName, categoryID, brandID, 
      hasFile: !!imageFile, removeImage 
    });

    // Get current appliance data
    const currentAppliance = await pool.query(
      'SELECT "modelCode", image_url FROM "Appliance" WHERE "applianceID" = $1',
      [id]
    );

    if (currentAppliance.rows.length === 0) {
      return res.status(404).json({ message: 'Appliance not found' });
    }

    const currentData = currentAppliance.rows[0];
    
    // Check if model code already exists (exclude current appliance)
    if (modelCode && modelCode !== currentData.modelCode) {
      const existing = await pool.query(
        'SELECT "applianceID" FROM "Appliance" WHERE "modelCode" = $1 AND "applianceID" != $2',
        [modelCode, id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ message: 'Model code already exists' });
      }
    }
    
    let imageUrl = currentData.image_url; // Keep existing by default
    
    // Handle image update using Supabase (same as createAppliance)
    if (imageFile) {
      console.log('📤 New image file uploaded, saving to Supabase...');
      
      // Upload new image to Supabase Storage
      const fileExt = imageFile.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
      const filePath = `appliances/${modelCode || currentData.modelCode}/${fileName}`;

      console.log(`📸 Uploading updated appliance image to Supabase: ${filePath}`);

      const { error: uploadError } = await supabase.storage
        .from('appliance-images')
        .upload(filePath, imageFile.buffer, {
          contentType: imageFile.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('appliance-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
      console.log(`✅ Updated appliance image uploaded to Supabase: ${imageUrl}`);
      
      // TODO: Consider deleting old image from Supabase if needed
      
    } else if (removeImage === 'true') {
      // Remove image explicitly
      imageUrl = null;
      console.log('🗑️ Image marked for removal');
      
      // TODO: Consider deleting image from Supabase if needed
    }
    // If neither new file nor remove flag, keep existing image
    
    const result = await pool.query(
      `UPDATE "Appliance" 
       SET "modelCode" = $1, "modelName" = $2, "categoryID" = $3, 
           "brandID" = $4, "description" = $5, "image_url" = $6
       WHERE "applianceID" = $7 
       RETURNING *`,
      [
        modelCode || currentData.modelCode,
        modelName, 
        categoryID, 
        brandID, 
        description || null, 
        imageUrl, 
        id
      ]
    );
    
    console.log('✅ Appliance updated in database:', result.rows[0]);
    res.json({
      message: 'Appliance updated successfully',
      appliance: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Update appliance error:', error);
    res.status(500).json({ message: 'Failed to update appliance' });
  }
};


// Update appliance status
export const updateApplianceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE "Appliance" SET status = $1 WHERE "applianceID" = $2 RETURNING "applianceID", status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appliance not found' });
    }

    console.log('✅ Appliance status updated:', result.rows[0]);
    res.json({
      message: 'Appliance status updated successfully',
      appliance: result.rows[0]
    });
  } catch (error) {
    console.error('Update appliance status error:', error);
    res.status(500).json({ message: 'Failed to update appliance status' });
  }
};

// =====================================================
// CATEGORY MANAGEMENT
// =====================================================

// Create new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { categoryName, description } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if category name already exists
    const existing = await pool.query(
      'SELECT "categoryID" FROM "Category" WHERE "categoryName" = $1',
      [categoryName]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO "Category" ("categoryName", description, count, status)
       VALUES ($1, $2, 0, 'ACTIVE')
       RETURNING *`,
      [categoryName, description || null]
    );

    console.log('✅ Category created:', result.rows[0]);
    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryName, description } = req.body;

    // Check if category name is taken by another category
    const existing = await pool.query(
      'SELECT "categoryID" FROM "Category" WHERE "categoryName" = $1 AND "categoryID" != $2',
      [categoryName, id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const result = await pool.query(
      `UPDATE "Category"
       SET "categoryName" = $1, description = $2
       WHERE "categoryID" = $3
       RETURNING *`,
      [categoryName, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    console.log('✅ Category updated:', result.rows[0]);
    res.json({
      message: 'Category updated successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// Update category status
export const updateCategoryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // If trying to set status to INACTIVE, check if this is the last active category
    if (status === 'INACTIVE') {
      const activeCount = await pool.query(
        'SELECT COUNT(*) as count FROM "Category" WHERE status = $1',
        ['ACTIVE']
      );

      if (parseInt(activeCount.rows[0].count) <= 1) {
        return res.status(400).json({ message: 'Cannot deactivate the last active category. At least one category must remain active.' });
      }
    }

    const result = await pool.query(
      'UPDATE "Category" SET status = $1 WHERE "categoryID" = $2 RETURNING "categoryID", status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    console.log('✅ Category status updated:', result.rows[0]);
    res.json({
      message: 'Category status updated successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Update category status error:', error);
    res.status(500).json({ message: 'Failed to update category status' });
  }
};

// =====================================================
// BRAND MANAGEMENT
// =====================================================

// Create new brand
export const createBrand = async (req: Request, res: Response) => {
  try {
    const { brandName, description } = req.body;

    if (!brandName) {
      return res.status(400).json({ message: 'Brand name is required' });
    }

    // Check if brand name already exists
    const existing = await pool.query(
      'SELECT "brandID" FROM "Brand" WHERE "brandName" = $1',
      [brandName]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Brand name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO "Brand" ("brandName", description, count, status)
       VALUES ($1, $2, 0, 'ACTIVE')
       RETURNING *`,
      [brandName, description || null]
    );

    console.log('✅ Brand created:', result.rows[0]);
    res.status(201).json({
      message: 'Brand created successfully',
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ message: 'Failed to create brand' });
  }
};

// Update brand
export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { brandName, description } = req.body;

    // Check if brand name is taken by another brand
    const existing = await pool.query(
      'SELECT "brandID" FROM "Brand" WHERE "brandName" = $1 AND "brandID" != $2',
      [brandName, id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Brand name already exists' });
    }

    const result = await pool.query(
      `UPDATE "Brand"
       SET "brandName" = $1, description = $2
       WHERE "brandID" = $3
       RETURNING *`,
      [brandName, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    console.log('✅ Brand updated:', result.rows[0]);
    res.json({
      message: 'Brand updated successfully',
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ message: 'Failed to update brand' });
  }
};

// Update brand status
export const updateBrandStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // If trying to set status to INACTIVE, check if this is the last active brand
    if (status === 'INACTIVE') {
      const activeCount = await pool.query(
        'SELECT COUNT(*) as count FROM "Brand" WHERE status = $1',
        ['ACTIVE']
      );

      if (parseInt(activeCount.rows[0].count) <= 1) {
        return res.status(400).json({ message: 'Cannot deactivate the last active brand. At least one brand must remain active.' });
      }
    }

    const result = await pool.query(
      'UPDATE "Brand" SET status = $1 WHERE "brandID" = $2 RETURNING "brandID", status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    console.log('✅ Brand status updated:', result.rows[0]);
    res.json({
      message: 'Brand status updated successfully',
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Update brand status error:', error);
    res.status(500).json({ message: 'Failed to update brand status' });
  }
};

// =====================================================
// PRICE LIST MANAGEMENT
// =====================================================

// Get all buyer prices for appliances
export const getAllBuyerPrices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        ba."buyerID",
        ba."applianceID",
        ba."basePrice",
        u.buyer_id,
        u.name as "buyerName",
        u.username as "buyerUsername",
        a."modelCode",
        a."modelName",
        c."categoryName",
        b."brandName",
        a.status as "applianceStatus"
      FROM "BuyerAppliance" ba
      LEFT JOIN users u ON ba."buyerID" = u.buyer_id
      LEFT JOIN "Appliance" a ON ba."applianceID" = a."applianceID"
      LEFT JOIN "Category" c ON a."categoryID" = c."categoryID"
      LEFT JOIN "Brand" b ON a."brandID" = b."brandID"
      WHERE u.user_type = 'buyer'
      ORDER BY u.buyer_id ASC, c."categoryName" ASC, b."brandName" ASC, a."modelName" ASC`
    );

    console.log('💰 Fetched buyer prices:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Get buyer prices error:', error);
    res.status(500).json({ message: 'Failed to fetch buyer prices' });
  }
};
