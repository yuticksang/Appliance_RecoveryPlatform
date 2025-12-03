import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import cron from 'node-cron';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';
import buyerRoutes from './routes/buyer';
import scoringConfigRoutes from './routes/scoringConfig';
import transactionRoutes from './routes/transaction';
import cronRoutes from './routes/cron';
import dbPool from './config/database';
import questionnaireRouter from './routes/questionnaire';
import { executeAutoCancellation } from './controllers/cronController';
const notificationRoutes = require('./routes/notification').default;

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Test database connection on startup
dbPool.connect()
  .then(client => {
    console.log('✅ Connected to EasyRecovery DB');
    client.release();
  })
  .catch(err => console.error('❌ Database connection error:', err));

// ✅ SIMPLIFIED CRON JOB - Uses shared function from cronController
cron.schedule('*/2 * * * *', async () => {
  console.log('⏰ Running scheduled auto-cancellation check...');
  try {
    const result = await executeAutoCancellation();
    console.log(`🤖 Auto-cancellation complete. Total cancelled: ${result.totalCancelled} transactions`);
  } catch (error) {
    console.error('❌ Error in scheduled auto-cancellation:', error);
  }
});
console.log('✅ Cron job scheduled: Auto-cancellation runs every 2 minutes');

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api', profileRoutes);
app.use('/api/scoring-config', scoringConfigRoutes);
app.use('/api', questionnaireRouter); 
app.use('/api/transactions', transactionRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/notifications', notificationRoutes);
console.log('📢 Notification routes registered successfully');

// Health route
app.get('/health', (req, res) => res.json({ ok: true, message: 'Server is running' }));

// Serve Angular frontend
const clientPath = path.join(__dirname, '../../dist/easyrecovery');
app.use(express.static(clientPath));
app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(clientPath, 'index.html')));

// Start server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
