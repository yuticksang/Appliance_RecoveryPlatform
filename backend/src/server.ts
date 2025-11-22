import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import cron from 'node-cron';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';
import transactionRoutes from './routes/transaction';
import cronRoutes from './routes/cron';
import dbPool from './config/database';
import questionnaireRouter from './routes/questionnaire';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  },
  // Force IPv4
  host: 'db.eoswarqcyddigaxhlgyb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres.eoswarqcyddigaxhlgyb',
  password: 'easyrecovery'
});

pool.connect()
  .then(() => console.log('✅ Connected to EasyRecovery DB'))
  .catch(err => console.error('❌ Database connection error:', err));

// Setup automatic cron job for auto-cancellation
// Runs every day at midnight (00:00)
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Running scheduled auto-cancellation check...');
  try {
    // Case 3: Cancel transactions where responseDeadline has passed
    const case3Result = await dbPool.query(
      `UPDATE "Transaction" t
       SET "transactionStatus" = 'Cancelled', "updatedAt" = NOW()
       WHERE t."transactionStatus" = 'Awaiting Confirmation'
       AND t."responseDeadline" IS NOT NULL
       AND t."responseDeadline" < NOW()
       RETURNING t."transactionID"`
    );

    if (case3Result.rows.length > 0) {
      const case3TxnIds = case3Result.rows.map(row => row.transactionID);
      await dbPool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = 'Unresponded', "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::varchar[])`,
        [case3TxnIds]
      );
      console.log(`✅ Case 3: Cancelled ${case3Result.rows.length} transactions (no response to offer)`);
    }

    // Case 4: Cancel transactions where item is "Awaiting Pick Up" for more than 14 days
    const case4Result = await dbPool.query(
      `UPDATE "Transaction" t
       SET "transactionStatus" = 'Cancelled', "updatedAt" = NOW()
       FROM "ItemStatus" i
       WHERE t."transactionID" = i."transactionID"
       AND i."itemStatus" = 'Awaiting Pick Up'
       AND i."updatedAt" < NOW() - INTERVAL '14 days'
       AND t."transactionStatus" NOT IN ('Cancelled', 'Completed', 'Rejected')
       RETURNING t."transactionID"`
    );

    if (case4Result.rows.length > 0) {
      const case4TxnIds = case4Result.rows.map(row => row.transactionID);
      await dbPool.query(
        `UPDATE "ItemStatus"
         SET "itemStatus" = 'Unresponded', "updatedAt" = NOW()
         WHERE "transactionID" = ANY($1::varchar[])`,
        [case4TxnIds]
      );
      console.log(`✅ Case 4: Cancelled ${case4Result.rows.length} transactions (no pickup response)`);
    }

    const total = case3Result.rows.length + case4Result.rows.length;
    console.log(`✅ Auto-cancellation complete. Total cancelled: ${total}`);
  } catch (error) {
    console.error('❌ Error in scheduled auto-cancellation:', error);
  }
});
console.log('⏰ Cron job scheduled: Auto-cancellation runs daily at midnight');

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// REMOVE THESE TWO LINES COMPLETELY
// app.use(express.json());
// app.use(express.json({ limit: '10mb' }));   ← DELETE THIS LINE

// Only apply JSON parser where needed (NOT for multipart routes)
// app.use('/api/auth', express.json());
// app.use('/api/admin', express.json());
// app.use('/api/profile', express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', profileRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api', questionnaireRouter); 
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health route
app.get('/health', (req, res) => res.json({ ok: true, message: 'Server is running' }));

// Serve Angular frontend (when built) - using CommonJS __dirname
const clientPath = path.join(__dirname, '../../dist/easyrecovery');
app.use(express.static(clientPath));
// Use regex pattern instead of * for Express 5.x compatibility
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientPath, 'index.html')));

// Start server
app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));