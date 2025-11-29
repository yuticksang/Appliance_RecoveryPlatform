import { Request, Response } from 'express';
import pool from '../config/database';

// =====================================================
// BUYER CONDITION GROUP & OPTION RETRIEVAL
// =====================================================

export const getBuyerConditionGroups = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        cg."groupID",
        cg."criteriaName",
        cg."question_title",
        cg."question_type",
        cg."display_order"
      FROM "ConditionGroup" cg
      WHERE cg."status" = 'ACTIVE'
      AND cg."question_type" IN ('radio', 'checkbox', 'image')
      ORDER BY COALESCE(cg."display_order", 999999) ASC, cg."created_at" ASC
    `);

    console.log('‚ Fetched buyer condition groups:', result.rows.length);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get buyer condition groups error:', error);
    res.status(500).json({
      message: 'Failed to fetch condition groups',
      error: error.message
    });
  }
};

export const getBuyerConditionOptions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        co."conditionID",
        co."groupID",
        co.code,
        co.description,
        co.image,
        co.status,
        co.question,
        co.created_at,
        cg."criteriaName",
        cg."question_type",
        cg."display_order",
        STRING_AGG(c."categoryName", ', ' ORDER BY c."categoryName") as "categoryNames"
      FROM "ConditionOption" co
      INNER JOIN "ConditionGroup" cg ON co."groupID" = cg."groupID"
      LEFT JOIN "Category_Condition" cc ON co."conditionID" = cc."conditionID"
      LEFT JOIN "Category" c ON cc."categoryID" = c."categoryID"
      WHERE cg."status" = 'ACTIVE'
      AND cg."question_type" IN ('radio', 'checkbox', 'image')
      GROUP BY co."conditionID", co."groupID", co.code, co.description, co.image, co.status, co.question, co.created_at, cg."criteriaName", cg."question_type", cg."display_order"
      ORDER BY cg."display_order" ASC NULLS LAST, co.created_at ASC
    `);

    console.log('‚ Fetched buyer condition options:', result.rows.length);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get buyer condition options error:', error);
    res.status(500).json({
      message: 'Failed to fetch condition options',
      error: error.message
    });
  }
};

export const getBuyerCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT "categoryID", "categoryName"
      FROM "Category"
      WHERE status = 'ACTIVE'
      ORDER BY "categoryName" ASC
    `);

    console.log('‚ Fetched buyer categories:', result.rows.length);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get buyer categories error:', error);
    res.status(500).json({
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// =====================================================
// BUYER MARKDOWN MANAGEMENT
// =====================================================

export const getBuyerMarkdowns = async (req: Request, res: Response) => {
  try {
    const buyerID = (req as any).user?.buyerId;

    if (!buyerID) {
      return res.status(401).json({ message: 'Unauthorized - No buyer ID found' });
    }

    const result = await pool.query(`
      SELECT
        bm."buyerID",
        bm."conditionID",
        bm."markdownPercentage",
        co.code as "conditionCode",
        co.description as "conditionDescription"
      FROM "BuyerMarkdown" bm
      LEFT JOIN "ConditionOption" co ON bm."conditionID" = co."conditionID"
      WHERE bm."buyerID" = $1
      ORDER BY co.code ASC
    `, [buyerID]);

    console.log(`‚ Fetched markdowns for buyer ${buyerID}:`, result.rows.length);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get buyer markdowns error:', error);
    res.status(500).json({
      message: 'Failed to fetch buyer markdowns',
      error: error.message
    });
  }
};

export const saveBuyerMarkdowns = async (req: Request, res: Response) => {
  try {
    const buyerID = (req as any).user?.buyerId;
    const { markdowns } = req.body; // Array of { conditionID, markdownPercentage }

    if (!buyerID) {
      return res.status(401).json({ message: 'Unauthorized - No buyer ID found' });
    }

    if (!markdowns || !Array.isArray(markdowns)) {
      return res.status(400).json({ message: 'Markdowns array is required' });
    }

    await pool.query('BEGIN');

    // Delete existing markdowns for this buyer
    await pool.query(
      'DELETE FROM "BuyerMarkdown" WHERE "buyerID" = $1',
      [buyerID]
    );

    // Insert new markdowns
    if (markdowns.length > 0) {
      for (const markdown of markdowns) {
        const { conditionID, markdownPercentage } = markdown;

        // Validate markdown percentage
        if (markdownPercentage < 0 || markdownPercentage > 100) {
          await pool.query('ROLLBACK');
          return res.status(400).json({
            message: `Invalid markdown percentage for condition ${conditionID}. Must be between 0 and 100.`
          });
        }

        // Round to whole number (integer)
        const roundedMarkdown = Math.round(markdownPercentage);

        // Insert the markdown
        await pool.query(`
          INSERT INTO "BuyerMarkdown" ("buyerID", "conditionID", "markdownPercentage")
          VALUES ($1, $2, $3)
          ON CONFLICT ("buyerID", "conditionID")
          DO UPDATE SET "markdownPercentage" = $3
        `, [buyerID, conditionID, roundedMarkdown]);
      }
    }

    await pool.query('COMMIT');

    console.log(` Saved ${markdowns.length} markdowns for buyer ${buyerID}`);
    res.json({
      message: 'Markdowns saved successfully',
      count: markdowns.length
    });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Save buyer markdowns error:', error);
    res.status(500).json({
      message: 'Failed to save buyer markdowns',
      error: error.message
    });
  }
};

export const updateSingleBuyerMarkdown = async (req: Request, res: Response) => {
  try {
    const buyerID = (req as any).user?.buyerId;
    const { conditionId } = req.params;
    const { markdownPercentage } = req.body;

    if (!buyerID) {
      return res.status(401).json({ message: 'Unauthorized - No buyer ID found' });
    }

    if (markdownPercentage === undefined || markdownPercentage === null) {
      return res.status(400).json({ message: 'Markdown percentage is required' });
    }

    if (markdownPercentage < 0 || markdownPercentage > 100) {
      return res.status(400).json({ message: 'Markdown percentage must be between 0 and 100' });
    }

    // Round to whole number (integer)
    const roundedMarkdown = Math.round(markdownPercentage);

    const result = await pool.query(`
      INSERT INTO "BuyerMarkdown" ("buyerID", "conditionID", "markdownPercentage")
      VALUES ($1, $2, $3)
      ON CONFLICT ("buyerID", "conditionID")
      DO UPDATE SET "markdownPercentage" = $3
      RETURNING *
    `, [buyerID, conditionId, roundedMarkdown]);

    console.log(` Updated markdown for buyer ${buyerID}, condition ${conditionId}`);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update buyer markdown error:', error);
    res.status(500).json({
      message: 'Failed to update buyer markdown',
      error: error.message
    });
  }
};

export const deleteBuyerMarkdown = async (req: Request, res: Response) => {
  try {
    const buyerID = (req as any).user?.buyerId;
    const { conditionId } = req.params;

    if (!buyerID) {
      return res.status(401).json({ message: 'Unauthorized - No buyer ID found' });
    }

    const result = await pool.query(
      'DELETE FROM "BuyerMarkdown" WHERE "buyerID" = $1 AND "conditionID" = $2 RETURNING *',
      [buyerID, conditionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Markdown not found' });
    }

    console.log(` Deleted markdown for buyer ${buyerID}, condition ${conditionId}`);
    res.json({ message: 'Markdown deleted successfully' });
  } catch (error: any) {
    console.error('Delete buyer markdown error:', error);
    res.status(500).json({
      message: 'Failed to delete buyer markdown',
      error: error.message
    });
  }
};
