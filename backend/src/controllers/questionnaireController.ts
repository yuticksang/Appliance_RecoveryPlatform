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

// Get Condition Group and Condition Options (filtered by category)
export const getConditionGroups = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getConditionGroups req.params:', req.params);
    const categoryId = req.params.categoryId;

    if (!categoryId) {
      return res.status(400).json({ message: 'categoryId is required' });
    }

    const result = await pool.query(`
          SELECT
            cg."groupID",
            cg."criteriaName" AS "sectionName",
            cg."question_title" AS question,
            cg."question_type" AS type,
            cg."display_order" AS "displayOrder",
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
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
                ORDER BY jsonb_build_object(
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
              ) FILTER (WHERE co."conditionID" IS NOT NULL),
              '[]'
            ) AS options

          FROM "ConditionGroup" cg
          LEFT JOIN "ConditionOption" co
            ON co."groupID" = cg."groupID"
            AND co.status = 'ACTIVE'
            AND (
              -- Include options that are linked to this category
              EXISTS (
                SELECT 1
                FROM "Category_Condition" cc
                WHERE cc."conditionID" = co."conditionID"
                AND cc."categoryID" = $1
              )
              -- OR if this is a question type that doesn't have options (textarea, file_upload)
              OR cg."question_type" IN ('textarea', 'file_upload')
            )
          WHERE cg.status = 'ACTIVE'
          AND (
            -- Include groups that have options linked to this category
            EXISTS (
              SELECT 1
              FROM "ConditionOption" co2
              JOIN "Category_Condition" cc ON cc."conditionID" = co2."conditionID"
              WHERE co2."groupID" = cg."groupID"
              AND cc."categoryID" = $1
            )
            -- OR include groups that are textarea/file_upload (no options needed)
            OR cg."question_type" IN ('textarea', 'file_upload')
          )
          GROUP BY
            cg."groupID",
            cg."criteriaName",
            cg."question_title",
            cg."question_type",
            cg."display_order"
          ORDER BY cg."display_order" ASC;
        `, [categoryId]);

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

    // Generate SAxxx ID
    const submittedApplianceID = await generateSubmittedApplianceID(client);

    // Insert into SubmittedAppliance (only basic info, all questions go to ConditionSelected)
    const subRes = await client.query(
      `INSERT INTO "SubmittedAppliance" (
        "submittedApplianceID", "sellerID", "applianceID", "addressID",
        "initialOfferPrice"
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING "submittedApplianceID"`,
      [
        submittedApplianceID,
        sellerId,
        modelId,
        addressId,
        parseFloat(valuationWorth) || 0
      ]
    );

    const finalId = subRes.rows[0].submittedApplianceID;

    // ─────────────────────────────────────────────────────────
    // SAVE ALL DYNAMIC ANSWERS TO ConditionSelected
    // selectedBy = 'seller' for initial submission
    // Supports: radio, checkbox, dropdown, image, textarea, file_upload
    // ─────────────────────────────────────────────────────────
    let savedCount = 0;
    for (const qa of questionAnswers) {
      console.log(`🔄 Processing question: groupID=${qa.groupID}, type=${qa.type}, answer=`, qa.answer);

      // For radio/image/dropdown: single conditionID
      if ((qa.type === 'radio' || qa.type === 'image' || qa.type === 'dropdown') && qa.answer) {
        console.log(`  → Saving ${qa.type} answer: ${qa.answer}`);
        await client.query(
          `INSERT INTO "ConditionSelected"
          ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID")
          VALUES ($1, $2, true, 'seller', NOW(), $3)`,
          [qa.answer, finalId, qa.groupID]
        );
        savedCount++;
      }

      // For checkbox: array of conditionIDs
      if (qa.type === 'checkbox' && Array.isArray(qa.answer)) {
        console.log(`  → Saving ${qa.answer.length} checkbox items`);
        for (const conditionID of qa.answer) {
          await client.query(
            `INSERT INTO "ConditionSelected"
            ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID")
            VALUES ($1, $2, true, 'seller', NOW(), $3)`,
            [conditionID, finalId, qa.groupID]
          );
          savedCount++;
        }
      }

      // For textarea: save text value
      if (qa.type === 'textarea' && qa.answer) {
        console.log(`  → Saving textarea answer (${qa.answer.length} chars)`);
        await client.query(
          `INSERT INTO "ConditionSelected"
          ("conditionID", "submittedApplianceID", "isChecked", "selectedBy", "selectedAt", "groupID", "textValue")
          VALUES (NULL, $1, true, 'seller', NOW(), $2, $3)`,
          [finalId, qa.groupID, qa.answer]
        );
        savedCount++;
      }

      // For file_upload: photos are saved to Photo table (handled below)
      if (qa.type === 'file_upload') {
        console.log(`  → File upload - will be saved to Photo table with groupID`);
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

    // Fetch current address details to snapshot them
    const addressSnapshot = await client.query(
      `SELECT "receiverName", "phoneNum", "pickupAddress", city, state, "zipCode"
       FROM "PickupAddress"
       WHERE "addressID" = $1`,
      [addressId]
    );

    if (addressSnapshot.rows.length === 0) {
      throw new Error('Selected pickup address not found');
    }

    const addr = addressSnapshot.rows[0];

    // Insert Pickup Table with snapshot data
    await client.query(
      `INSERT INTO "Pickup" (
        "submittedApplianceID",
        "addressID",
        "pickupDate",
        "pickupTimeSlot",
        "snapshotReceiverName",
        "snapshotPhoneNum",
        "snapshotAddress",
        "snapshotCity",
        "snapshotState",
        "snapshotZipCode"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        finalId,
        addressId,
        pickupDate,
        pickupTime,
        addr.receiverName,
        addr.phoneNum,
        addr.pickupAddress,
        addr.city,
        addr.state,
        addr.zipCode
      ]
    );

    // Create Transaction record
    await client.query(
      `INSERT INTO "Transaction" (
        "submittedApplianceID", "sellerID",
        "transactionStatus", "createdAt", "updatedAt"
      ) VALUES ($1, $2, 'Under Review', NOW(), NOW())`,
      [finalId, sellerId]
    );

    // Get transactionID
    const transRes = await client.query(
      `SELECT "transactionID" FROM "Transaction" WHERE "submittedApplianceID" = $1`,
      [finalId]
    );

    const transactionId = transRes.rows[0]?.transactionID;

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