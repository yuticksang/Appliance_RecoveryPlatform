import { Request, Response } from 'express';
import pool from '../config/database';

console.log('🔥🔥🔥 conditionController.ts loaded! 🔥🔥🔥');

// =====================================================
// CONDITION GROUP MANAGEMENT
// =====================================================

export const getAllConditionGroups = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        cg."groupID",
        cg."criteriaName",
        cg."criteriaCodePrefix",
        cg."question_title",
        cg."question_type",
        cg."display_order",
        cg."status",
        cg."created_at",
        COALESCE(
          JSON_AGG(
            CASE WHEN ccg."categoryID" IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'categoryID', ccg."categoryID",
                'weightPercentage', ccg."weightPercentage"
              )
            END
          ) FILTER (WHERE ccg."categoryID" IS NOT NULL),
          '[]'::json
        ) as categories
      FROM "ConditionGroup" cg
      LEFT JOIN "Category_ConditionGroup" ccg ON cg."groupID" = ccg."groupID"
      GROUP BY cg."groupID", cg."criteriaName", cg."criteriaCodePrefix",
               cg."question_title", cg."question_type", cg."display_order", cg."status", cg."created_at"
      ORDER BY COALESCE(cg."display_order", 999999) ASC, cg."created_at" ASC
    `);

    console.log('📂 Fetched condition groups with categories:', result.rows.length);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get all condition groups error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to fetch condition groups',
      error: error.message,
      details: error.detail
    });
  }
};

export const createConditionGroup = async (req: Request, res: Response) => {
  try {
    const { criteriaName, criteriaCodePrefix, question_title } = req.body;

    if (!criteriaName) {
      return res.status(400).json({ message: 'Criteria name is required' });
    }

    if (!criteriaCodePrefix) {
      return res.status(400).json({ message: 'Code prefix is required' });
    }

    if (!question_title) {
      return res.status(400).json({ message: 'Question title is required' });
    }

    // Check if criteria name already exists
    const existingName = await pool.query(
      'SELECT "groupID" FROM "ConditionGroup" WHERE "criteriaName" = $1',
      [criteriaName]
    );

    if (existingName.rows.length > 0) {
      return res.status(400).json({ message: 'Criteria name already exists' });
    }

    // Check if code prefix already exists
    const existingPrefix = await pool.query(
      'SELECT "groupID" FROM "ConditionGroup" WHERE "criteriaCodePrefix" = $1',
      [criteriaCodePrefix]
    );

    if (existingPrefix.rows.length > 0) {
      return res.status(400).json({ message: 'Code prefix already exists. Please use a unique prefix.' });
    }

    // Get the next display_order (max + 1)
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX("display_order"), 0) as max_order FROM "ConditionGroup"'
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    const result = await pool.query(
      `INSERT INTO "ConditionGroup" ("criteriaName", "criteriaCodePrefix", "question_title", "display_order", status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING "groupID", "criteriaName", "criteriaCodePrefix", "question_title", "display_order", created_at, status`,
      [criteriaName, criteriaCodePrefix, question_title, nextOrder]
    );

    console.log('✅ Created condition group:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create condition group error:', error);
    res.status(500).json({ message: 'Failed to create condition group' });
  }
};

export const updateConditionGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { criteriaName, criteriaCodePrefix, question_title, question_type, status, display_order } = req.body;

    if (!criteriaName) {
      return res.status(400).json({ message: 'Criteria name is required' });
    }

    // Check if new name conflicts with another group
    const existing = await pool.query(
      'SELECT "groupID" FROM "ConditionGroup" WHERE "criteriaName" = $1 AND "groupID" != $2',
      [criteriaName, id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Criteria name already exists' });
    }

    // If display_order is being updated, check if it conflicts with another group
    if (display_order !== undefined) {
      const orderConflict = await pool.query(
        'SELECT "groupID" FROM "ConditionGroup" WHERE "display_order" = $1 AND "groupID" != $2',
        [display_order, id]
      );

      if (orderConflict.rows.length > 0) {
        return res.status(400).json({ message: 'Display order already exists. Please use a unique order number.' });
      }
    }

    const result = await pool.query(
      `UPDATE "ConditionGroup"
       SET "criteriaName" = $1,
           "criteriaCodePrefix" = $2,
           "question_title" = $3,
           "question_type" = $4,
           "status" = $5,
           "display_order" = COALESCE($6, "display_order")
       WHERE "groupID" = $7
       RETURNING "groupID", "criteriaName", "criteriaCodePrefix", "question_title", "question_type", "display_order", "status", "created_at"`,
      [criteriaName, criteriaCodePrefix || null, question_title || null, question_type || null, status || 'ACTIVE', display_order, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Condition group not found' });
    }

    console.log('✅ Updated condition group:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update condition group error:', error);
    res.status(500).json({ message: 'Failed to update condition group' });
  }
};

export const updateConditionGroupStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required (ACTIVE or INACTIVE)' });
    }

    const result = await pool.query(
      `UPDATE "ConditionGroup"
       SET status = $1
       WHERE "groupID" = $2
       RETURNING "groupID", "criteriaName", status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Condition group not found' });
    }

    console.log('✅ Updated condition group status:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update condition group status error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

// =====================================================
// CONDITION OPTION MANAGEMENT
// =====================================================

export const getAllConditionOptions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT co."conditionID", co."groupID", co.code, co.description, co.image, co.status, co.question, co.created_at,
              cg."criteriaName", cg."criteriaCodePrefix", cg.created_at as group_created_at,
              STRING_AGG(c."categoryName", ', ' ORDER BY c."categoryName") as categories
       FROM "ConditionOption" co
       LEFT JOIN "ConditionGroup" cg ON co."groupID" = cg."groupID"
       LEFT JOIN "ConditionCategory" cc ON co."conditionID" = cc."conditionID"
       LEFT JOIN "Category" c ON cc."categoryID" = c."categoryID"
       GROUP BY co."conditionID", co."groupID", co.code, co.description, co.image, co.status, co.question, co.created_at,
                cg."criteriaName", cg."criteriaCodePrefix", cg.created_at
       ORDER BY cg.created_at ASC, co.created_at ASC`
    );

    console.log('📂 Fetched condition options:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all condition options error:', error);
    res.status(500).json({ message: 'Failed to fetch condition options' });
  }
};

export const getConditionOptionsByGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const result = await pool.query(
      `SELECT co."conditionID", co."groupID", co.code, co.description, co.image, co.status, co.question, co.created_at,
              STRING_AGG(c."categoryName", ', ' ORDER BY c."categoryName") as categories
       FROM "ConditionOption" co
       LEFT JOIN "ConditionCategory" cc ON co."conditionID" = cc."conditionID"
       LEFT JOIN "Category" c ON cc."categoryID" = c."categoryID"
       WHERE co."groupID" = $1
       GROUP BY co."conditionID"
       ORDER BY co.created_at ASC`,
      [groupId]
    );

    console.log(`📂 Fetched ${result.rows.length} condition options for group ${groupId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Get condition options by group error:', error);
    res.status(500).json({ message: 'Failed to fetch condition options' });
  }
};

export const createConditionOption = async (req: Request, res: Response) => {
  try {
    const { groupID, description, status, question } = req.body;
    const imageFile = req.file;

    console.log('📥 Create condition option request:', {
      groupID,
      description,
      status,
      question,
      hasFile: !!imageFile,
      fileName: imageFile?.filename
    });
    console.log('Full request body:', req.body);

    if (!groupID) {
      console.error('❌ Missing groupID');
      return res.status(400).json({ message: 'Group ID is required' });
    }

    // Verify group exists and get prefix
    console.log('🔍 Checking if group exists:', groupID);
    const groupCheck = await pool.query(
      'SELECT "groupID", "criteriaCodePrefix" FROM "ConditionGroup" WHERE "groupID" = $1',
      [groupID]
    );

    console.log('Group check result:', groupCheck.rows);

    if (groupCheck.rows.length === 0) {
      console.error('❌ Group not found:', groupID);
      return res.status(404).json({ message: 'Condition group not found' });
    }

    const prefix = groupCheck.rows[0].criteriaCodePrefix || '';
    let finalCode = null;

    // Auto-generate code based on prefix
    if (prefix) {
      // Get the highest numeric code for this group
      const lastCodeQuery = await pool.query(
        `SELECT code FROM "ConditionOption"
         WHERE "groupID" = $1 AND code ~ $2
         ORDER BY CAST(SUBSTRING(code FROM '[0-9]+') AS INTEGER) DESC LIMIT 1`,
        [groupID, `^${prefix}[0-9]+$`]
      );

      if (lastCodeQuery.rows.length > 0) {
        const lastCode = lastCodeQuery.rows[0].code;
        const lastNumber = parseInt(lastCode.replace(prefix, '')) || 0;
        finalCode = prefix + String(lastNumber + 1).padStart(3, '0');
        console.log(`🔢 Last code: ${lastCode}, Next code: ${finalCode}`);
      } else {
        finalCode = prefix + '001';
        console.log(`🔢 No existing codes, starting with: ${finalCode}`);
      }
    }

    // Get image path if file was uploaded
    const imagePath = imageFile ? `/uploads/conditions/${imageFile.filename}` : null;

    console.log('💾 Inserting into database:', {
      groupID,
      finalCode,
      description: description || null,
      imagePath,
      status: status || 'ACTIVE',
      question: question || null
    });

    const result = await pool.query(
      `INSERT INTO "ConditionOption" ("groupID", code, description, image, status, question)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING "conditionID", "groupID", code, description, image, status, question, created_at`,
      [groupID, finalCode, description || null, imagePath, status || 'ACTIVE', question || null]
    );

    console.log('✅ Created condition option:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create condition option error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({
      message: 'Failed to create condition option',
      error: error.message
    });
  }
};

export const updateConditionOption = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, imageUrl, status, question, removeImage } = req.body;
    const imageFile = req.file;

    console.log('📝 Update condition option:', { id, description, status, imageUrl, removeImage: removeImage === 'true', hasFile: !!imageFile });

    // Get current option to preserve existing image if no new one is uploaded
    const currentOption = await pool.query(
      'SELECT image FROM "ConditionOption" WHERE "conditionID" = $1',
      [id]
    );

    if (currentOption.rows.length === 0) {
      return res.status(404).json({ message: 'Condition option not found' });
    }

    // Determine final image path
    let finalImagePath;
    if (imageFile) {
      // New file uploaded
      finalImagePath = `/uploads/conditions/${imageFile.filename}`;
    } else if (removeImage === 'true') {
      // Explicitly remove image
      finalImagePath = null;
    } else if (imageUrl) {
      // Keep existing URL
      finalImagePath = imageUrl;
    } else {
      // Keep current image from database
      finalImagePath = currentOption.rows[0].image;
    }

    console.log('💾 Final image path:', finalImagePath);

    const result = await pool.query(
      `UPDATE "ConditionOption"
       SET description = $1, image = $2, status = $3, question = $4
       WHERE "conditionID" = $5
       RETURNING "conditionID", "groupID", code, description, image, status, question, created_at`,
      [description || null, finalImagePath, status || 'ACTIVE', question || null, id]
    );

    console.log('✅ Updated condition option:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update condition option error:', error);
    res.status(500).json({ message: 'Failed to update condition option' });
  }
};

export const deleteConditionOption = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "ConditionOption" WHERE "conditionID" = $1 RETURNING "conditionID"',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Condition option not found' });
    }

    console.log('✅ Deleted condition option:', id);
    res.json({ message: 'Condition option deleted successfully' });
  } catch (error) {
    console.error('Delete condition option error:', error);
    res.status(500).json({ message: 'Failed to delete condition option' });
  }
};

// =====================================================
// CONDITION CATEGORY MANAGEMENT
// =====================================================

export const getConditionCategories = async (req: Request, res: Response) => {
  try {
    const { conditionId } = req.params;

    const result = await pool.query(
      `SELECT cc."categoryID", c."categoryName"
       FROM "ConditionCategory" cc
       LEFT JOIN "Category" c ON cc."categoryID" = c."categoryID"
       WHERE cc."conditionID" = $1`,
      [conditionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get condition categories error:', error);
    res.status(500).json({ message: 'Failed to fetch condition categories' });
  }
};

export const updateConditionCategories = async (req: Request, res: Response) => {
  try {
    const { conditionId } = req.params;
    const { categoryIDs } = req.body;

    // Delete existing categories for this condition
    await pool.query(
      'DELETE FROM "ConditionCategory" WHERE "conditionID" = $1',
      [conditionId]
    );

    // Insert new categories
    if (categoryIDs && categoryIDs.length > 0) {
      const values = categoryIDs.map((catId: string) => `('${conditionId}', '${catId}')`).join(',');
      await pool.query(
        `INSERT INTO "ConditionCategory" ("conditionID", "categoryID") VALUES ${values}`
      );
    }

    console.log('✅ Updated condition categories for:', conditionId);
    res.json({ message: 'Categories updated successfully' });
  } catch (error) {
    console.error('Update condition categories error:', error);
    res.status(500).json({ message: 'Failed to update categories' });
  }
};

// =====================================================
// DISPLAY ORDER MANAGEMENT
// =====================================================

export const updateDisplayOrders = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { orders } = req.body; // Array of { groupID, display_order }

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ message: 'Orders array is required' });
    }

    await pool.query('BEGIN');
    
    for (const order of orders) {
      await pool.query(`
        UPDATE "Category_ConditionGroup" 
        SET "display_order" = $1 
        WHERE "categoryID" = $2 AND "groupID" = $3
      `, [order.display_order, categoryId, order.groupID]);
    }
    
    await pool.query('COMMIT');
    
    console.log('✅ Updated display orders for category:', categoryId);
    res.json({ message: 'Display orders updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating display orders:', error);
    res.status(500).json({ message: 'Failed to update display orders' });
  }
};
