import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Get packaging instructions by category ID
 * Falls back to default instructions (categoryID = 0) if no category-specific instructions exist
 */
export const getPackagingInstructions = async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  try {
    console.log('📦 Fetching packaging instructions for categoryId:', categoryId);

    // First, try to get category-specific instructions
    const categoryResult = await pool.query(
      `SELECT
        "instructionID",
        "categoryID",
        "sectionName",
        "instruction",
        "displayOrder",
        "isActive"
      FROM "PackagingInstruction"
      WHERE "categoryID" = $1 AND "isActive" = true
      ORDER BY "displayOrder" ASC`,
      [categoryId]
    );

    let instructions = categoryResult.rows;

    // If no category-specific instructions found, fall back to default (categoryID = 0)
    if (instructions.length === 0) {
      console.log('⚠️ No category-specific instructions found, falling back to default');
      const defaultResult = await pool.query(
        `SELECT
          "instructionID",
          "categoryID",
          "sectionName",
          "instruction",
          "displayOrder",
          "isActive"
        FROM "PackagingInstruction"
        WHERE "categoryID" = 0 AND "isActive" = true
        ORDER BY "displayOrder" ASC`
      );
      instructions = defaultResult.rows;
    }

    // Group instructions by section
    const groupedInstructions = instructions.reduce((acc: any, instruction: any) => {
      const section = instruction.sectionName;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push({
        id: instruction.instructionID,
        instruction: instruction.instruction,
        displayOrder: instruction.displayOrder
      });
      return acc;
    }, {});

    console.log('✅ Packaging instructions fetched successfully:', Object.keys(groupedInstructions));

    res.json({
      categoryId: parseInt(categoryId),
      sections: groupedInstructions,
      isDefault: instructions[0]?.categoryID === 0
    });
  } catch (error) {
    console.error('❌ Error fetching packaging instructions:', error);
    res.status(500).json({
      message: 'Failed to fetch packaging instructions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all packaging instructions (Admin only)
 */
export const getAllPackagingInstructions = async (req: Request, res: Response) => {
  try {
    console.log('📦 Fetching all packaging instructions for admin');

    const result = await pool.query(
      `SELECT
        pi."instructionID",
        pi."categoryID",
        pi."sectionName",
        pi."instruction",
        pi."displayOrder",
        pi."isActive",
        pi."createdAt",
        pi."updatedAt",
        CASE
          WHEN pi."categoryID" = '0' THEN 'Default (Fallback)'
          ELSE COALESCE(c."categoryName", 'Unknown')
        END as "categoryName"
      FROM "PackagingInstruction" pi
      LEFT JOIN "Category" c ON pi."categoryID"::text = c."categoryID"::text
      ORDER BY pi."categoryID" ASC, pi."displayOrder" ASC`
    );

    console.log('✅ All packaging instructions fetched:', result.rows.length);

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching all packaging instructions:', error);
    res.status(500).json({
      message: 'Failed to fetch packaging instructions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a new packaging instruction (Admin only)
 */
export const createPackagingInstruction = async (req: Request, res: Response) => {
  const { categoryId, sectionName, instruction, displayOrder } = req.body;

  // Validation
  if (!categoryId || !sectionName || !instruction || displayOrder === undefined) {
    return res.status(400).json({
      message: 'Missing required fields: categoryId, sectionName, instruction, displayOrder'
    });
  }

  try {
    console.log('📦 Creating new packaging instruction:', { categoryId, sectionName });

    // Insert the instruction
    const insertResult = await pool.query(
      `INSERT INTO "PackagingInstruction"
        ("categoryID", "sectionName", "instruction", "displayOrder", "isActive")
      VALUES ($1, $2, $3, $4, true)
      RETURNING "instructionID"`,
      [categoryId, sectionName, instruction, displayOrder]
    );

    const instructionID = insertResult.rows[0].instructionID;
    console.log('✅ Packaging instruction created:', instructionID);

    // Fetch the complete instruction with category name using the same query as getAllPackagingInstructions
    const result = await pool.query(
      `SELECT
        pi."instructionID",
        pi."categoryID",
        pi."sectionName",
        pi."instruction",
        pi."displayOrder",
        pi."isActive",
        pi."createdAt",
        pi."updatedAt",
        CASE
          WHEN pi."categoryID" = '0' THEN 'Default (Fallback)'
          ELSE COALESCE(c."categoryName", 'Unknown')
        END as "categoryName"
      FROM "PackagingInstruction" pi
      LEFT JOIN "Category" c ON pi."categoryID"::text = c."categoryID"::text
      WHERE pi."instructionID" = $1`,
      [instructionID]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Error creating packaging instruction:', error);

    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A packaging instruction with this category and step number already exists'
      });
    }

    res.status(500).json({
      message: 'Failed to create packaging instruction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update an existing packaging instruction (Admin only)
 */
export const updatePackagingInstruction = async (req: Request, res: Response) => {
  const { instructionId } = req.params;
  const { categoryId, sectionName, instruction, displayOrder, isActive } = req.body;

  // Validation
  if (!categoryId && !sectionName && !instruction === undefined && displayOrder === undefined && isActive === undefined) {
    return res.status(400).json({
      message: 'At least one field must be provided for update'
    });
  }

  try {
    console.log('📦 Updating packaging instruction:', instructionId);

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (categoryId !== undefined) {
      updates.push(`"categoryID" = $${paramCount++}`);
      values.push(categoryId);
    }
    if (sectionName !== undefined) {
      updates.push(`"sectionName" = $${paramCount++}`);
      values.push(sectionName);
    }
    if (instruction !== undefined) {
      updates.push(`"instruction" = $${paramCount++}`);
      values.push(instruction);
    }
    if (displayOrder !== undefined) {
      updates.push(`"displayOrder" = $${paramCount++}`);
      values.push(displayOrder);
    }
    if (isActive !== undefined) {
      updates.push(`"isActive" = $${paramCount++}`);
      values.push(isActive);
    }

    values.push(instructionId);

    const updateResult = await pool.query(
      `UPDATE "PackagingInstruction"
      SET ${updates.join(', ')}
      WHERE "instructionID" = $${paramCount}
      RETURNING "instructionID"`,
      values
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Packaging instruction not found' });
    }

    console.log('✅ Packaging instruction updated:', instructionId);

    // Fetch the complete instruction with category name using the same query as getAllPackagingInstructions
    const result = await pool.query(
      `SELECT
        pi."instructionID",
        pi."categoryID",
        pi."sectionName",
        pi."instruction",
        pi."displayOrder",
        pi."isActive",
        pi."createdAt",
        pi."updatedAt",
        CASE
          WHEN pi."categoryID" = '0' THEN 'Default (Fallback)'
          ELSE COALESCE(c."categoryName", 'Unknown')
        END as "categoryName"
      FROM "PackagingInstruction" pi
      LEFT JOIN "Category" c ON pi."categoryID"::text = c."categoryID"::text
      WHERE pi."instructionID" = $1`,
      [instructionId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating packaging instruction:', error);
    res.status(500).json({
      message: 'Failed to update packaging instruction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a packaging instruction (Admin only)
 */
export const deletePackagingInstruction = async (req: Request, res: Response) => {
  const { instructionId } = req.params;

  try {
    console.log('📦 Deleting packaging instruction:', instructionId);

    const result = await pool.query(
      `DELETE FROM "PackagingInstruction"
      WHERE "instructionID" = $1
      RETURNING "instructionID"`,
      [instructionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Packaging instruction not found' });
    }

    console.log('✅ Packaging instruction deleted:', instructionId);

    res.json({ message: 'Packaging instruction deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting packaging instruction:', error);
    res.status(500).json({
      message: 'Failed to delete packaging instruction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};