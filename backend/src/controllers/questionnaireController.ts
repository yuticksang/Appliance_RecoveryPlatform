import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import pool from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client ONCE at startup (best practice)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // ← Use ANON KEY (public)

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get all categories
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT "categoryID" as id, "categoryName" as name 
       FROM "Category" 
       WHERE "status" = 'ACTIVE'
       ORDER BY "categoryID" ASC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// Get Brands by Category
export const getBrandsByCategory = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getBrandsByCategory req.params:', req.params);
    const rawId = (req.params.categoryId ?? req.params.categoryID ?? req.params.id ?? '').toString().trim();
    if (!rawId) {
      return res.status(400).json({ message: 'categoryId is required' });
    }

    // Find distinct brands via Appliance -> Brand join
    const result = await pool.query(
      `SELECT DISTINCT b."brandID" AS id, b."brandName" AS name
       FROM "Appliance" a
       JOIN "Brand" b ON a."brandID" = b."brandID"
       WHERE a."categoryID" = $1
       AND b."status" = 'ACTIVE'
       ORDER BY b."brandName" ASC`,
      [rawId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get brands error:', error);
    return res.status(500).json({ message: 'Failed to fetch brands' });
  }
};

// Get Models by Brand
export const getModelsByBrand = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getModelsByBrand req.params:', req.params);
    //get categoryID and brandID from req.params
    const rawCategoryId = (req.params.categoryId ?? req.params.categoryID ?? '').toString().trim();
    const rawBrandId = (req.params.brandId ?? req.params.brandID ?? req.params.id ?? '').toString().trim();
    if (!rawBrandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }

    const result = await pool.query(
      `SELECT "applianceID" AS id, "modelName" AS name, "modelCode" AS code
       FROM "Appliance"
       WHERE "brandID" = $1
       AND "categoryID" = $2
       AND "status" = 'ACTIVE'
       ORDER BY "modelName" ASC`,
      [rawBrandId, rawCategoryId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get models error:', error);
    return res.status(500).json({ message: 'Failed to fetch models' });
  }
};

// Get Condition Group and Condition Options
export const getConditionGroups = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
          SELECT
            cg."groupID",
            cg."criteriaName" AS "sectionName",
            cg."question_title" AS question,
            cg."question_type" AS type,
            cg."display_order" AS "displayOrder",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', co."conditionID",
                  'code', co.code,
                  'description', co.description,
                  'image',
                    CASE
                      WHEN co.image IS NOT NULL AND co.image != ''
                      THEN 'http://localhost:3000' || co.image
                      ELSE NULL
                    END
                )
                ORDER BY co."conditionID"
              ) FILTER (WHERE co."conditionID" IS NOT NULL),
              '[]'
            ) AS options

          FROM "ConditionGroup" cg
          LEFT JOIN "ConditionOption" co
            ON co."groupID" = cg."groupID"
          AND co.status = 'ACTIVE'          -- ONLY ACTIVE OPTIONS
          WHERE cg.status = 'ACTIVE'          -- ONLY ACTIVE GROUPS
          GROUP BY
            cg."groupID",
            cg."criteriaName",
            cg."question_title",
            cg."question_type",
            cg."display_order"
          ORDER BY cg."display_order" ASC;
        `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get condition groups error:', error);
    res.status(500).json({ message: 'Failed to fetch condition groups' });
  }
};





// ---------- Multer: Save to local uploads (fallback) ----------
const uploadDir = path.join(__dirname, '../../uploads/questionnaire');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

const generateSubmittedApplianceID = async (client: any): Promise<string> => {
  const result = await client.query(
    `SELECT "submittedApplianceID" 
     FROM "SubmittedAppliance" 
     WHERE "submittedApplianceID" LIKE 'SA%' 
     ORDER BY "submittedApplianceID" DESC 
     LIMIT 1`
  );

  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].submittedApplianceID; // e.g. "SA012"
    const numPart = lastId.replace('SA', '');
    nextNumber = parseInt(numPart, 10) + 1;
  }

  return `SA${String(nextNumber).padStart(3, '0')}`; // SA001, SA002, …
};

// ---------- Submit Questionnaire ----------
export const submitQuestionnaire = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    console.log('📦 BODY →', req.body);
    console.log('📁 FILES →', req.files);

    const {
      modelId,
      addressId,
      valuationWorth,
      pickupDate,
      pickupTime,
      questionAnswers: questionAnswersJson
    } = req.body;

    if (!modelId || !addressId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Parse dynamic question answers
    let questionAnswers: any[] = [];
    try {
      questionAnswers = JSON.parse(questionAnswersJson || '[]');
    } catch (e) {
      console.error('Failed to parse questionAnswers:', e);
      return res.status(400).json({ message: 'Invalid question answers format' });
    }

    console.log('📋 Parsed Question Answers:', questionAnswers);

    // Get seller_id from users table
    const userRes = await client.query(
      'SELECT seller_id FROM users WHERE "userID" = $1',
      [userId]
    );
    if (!userRes.rows[0]?.seller_id) throw new Error('User not found');
    const sellerId = userRes.rows[0].seller_id;

    // ─────────────────────────────────────────────────────────
    // EXTRACT SPECIFIC FIELDS FROM DYNAMIC ANSWERS
    // ─────────────────────────────────────────────────────────

    // Strategy: Match by groupID directly (most reliable)
    // CG001 = Functional Status
    // CG002 = Physical Condition
    const functionalAnswer = questionAnswers.find(qa => qa.groupID === 'CG001');
    const physicalAnswer = questionAnswers.find(qa => qa.groupID === 'CG002');
    const notesAnswer = questionAnswers.find(qa => qa.type === 'textarea');

    console.log('🔍 Functional Answer:', functionalAnswer);
    console.log('🔍 Physical Answer:', physicalAnswer);
    console.log('🔍 Notes Answer:', notesAnswer);

    // Generate SAxxx ID
    const submittedApplianceID = await generateSubmittedApplianceID(client);

    // Insert into SubmittedAppliance
    const subRes = await client.query(
      `INSERT INTO "SubmittedAppliance" (
        "submittedApplianceID", "sellerID", "applianceID", "addressID",
        "initialFunctionalStatus", "initialPhysicalCondition",
        "initialOfferPrice", "note"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "submittedApplianceID"`,
      [
        submittedApplianceID,
        sellerId,
        modelId,
        addressId,
        functionalAnswer?.answerText || 'Not Specified',
        physicalAnswer?.answerText || 'Not Specified',
        parseFloat(valuationWorth) || 0,
        notesAnswer?.answer || null
      ]
    );

    const finalId = subRes.rows[0].submittedApplianceID;

    // ─────────────────────────────────────────────────────────
    // SAVE ALL ANSWERS TO ConditionSelected (for ALL types)
    // ─────────────────────────────────────────────────────────
    let savedCount = 0;
    for (const qa of questionAnswers) {
      console.log(`🔄 Processing question: groupID=${qa.groupID}, type=${qa.type}, answer=`, qa.answer);

      // For radio/image: single conditionID
      if ((qa.type === 'radio' || qa.type === 'image') && qa.answer) {
        console.log(`  → Saving radio/image answer: ${qa.answer}`);
        await client.query(
          `INSERT INTO "ConditionSelected"
          ("conditionID", "submittedApplianceID", "isChecked", "created_at")
          VALUES ($1, $2, true, NOW())`,
          [qa.answer, finalId]
        );
        savedCount++;
      }

      // For checkbox: array of conditionIDs
      if (qa.type === 'checkbox' && Array.isArray(qa.answer)) {
        console.log(`  → Saving ${qa.answer.length} checkbox answers`);
        for (const conditionID of qa.answer) {
          await client.query(
            `INSERT INTO "ConditionSelected"
            ("conditionID", "submittedApplianceID", "isChecked", "created_at")
            VALUES ($1, $2, true, NOW())`,
            [conditionID, finalId]
          );
          savedCount++;
        }
      }

      // Textarea is saved to note field, not ConditionSelected
      if (qa.type === 'textarea') {
        console.log(`  → Textarea saved to note field (not ConditionSelected)`);
      }
    }

    console.log(`✅ Saved ${savedCount} condition selections for ${finalId} (out of ${questionAnswers.length} total answers)`);

    // VERIFY: Check what was actually saved in the database
    const verifyResult = await client.query(
      `SELECT COUNT(*) as count FROM "ConditionSelected" WHERE "submittedApplianceID" = $1`,
      [finalId]
    );
    console.log(`🔍 VERIFICATION: ConditionSelected table has ${verifyResult.rows[0].count} rows for ${finalId}`);

    // Insert Pickup Table
    if (!pickupDate || !pickupTime) {
      throw new Error('Please select pickup date and time');
    }

    // Insert Pickup Table
    await client.query(
      `INSERT INTO "Pickup" (
        "submittedApplianceID", 
        "addressID", 
        "pickupDate", 
        "pickupTimeSlot"
      ) VALUES ($1, $2, $3, $4)`,
      [
        finalId,
        addressId,
        pickupDate,      // Format: YYYY-MM-DD
        pickupTime       // Format: "14:00-16:00" or whatever you send
      ]
    );

    // Insert Slip Table
    await client.query(
      `INSERT INTO "RecoverySlip" (
        "submittedApplianceID"
      ) VALUES ($1)`,
      [finalId]
    );

    // Create Transaction record
    const transactionId = `TXN-${Date.now()}`;
    await client.query(
      `INSERT INTO "Transaction" (
        "transactionID", "submittedApplianceID", "sellerID",
        "transactionStatus", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, 'Under Review', NOW(), NOW())`,
      [transactionId, finalId, sellerId]
    );

    // Create ItemStatus record
    await client.query(
      `INSERT INTO "ItemStatus" ("transactionID", "itemStatus", "updatedAt")
       VALUES ($1, 'Awaiting Pick Up', NOW())`,
      [transactionId]
    );


    // Upload photos to Supabase Storage
    const files = req.files as Express.Multer.File[];
    if (files?.length > 0) {
      for (const file of files) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
        const filePath = `submissions/${finalId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('questionnaire-photos')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('questionnaire-photos')
          .getPublicUrl(filePath);

        // Save to Photo table
        await client.query(
          `INSERT INTO "Photo" ("submittedApplianceID", "photoURL") VALUES ($1, $2)`,
          [finalId, publicUrl]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Submission successful!',
      submittedApplianceID: finalId
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Submit error:', error);
    res.status(500).json({
      message: 'Submission failed',
      error: error.message
    });
  } finally {
    client.release();
  }
};