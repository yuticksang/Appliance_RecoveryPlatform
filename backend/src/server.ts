import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';
import buyerRoutes from './routes/buyer';

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

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (must be before API routes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api', profileRoutes);

// Health route
app.get('/health', (req, res) => res.json({ ok: true, message: 'Server is running' }));

// Serve Angular frontend (when built) - using CommonJS __dirname
const clientPath = path.join(__dirname, '../../dist/easyrecovery');
app.use(express.static(clientPath));
// Use regex pattern instead of * for Express 5.x compatibility - exclude /api and /uploads
app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(clientPath, 'index.html')));

// Start server
app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));