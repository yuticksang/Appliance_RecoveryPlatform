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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log('✅ Connected to EasyRecovery DB'))
  .catch(err => console.error('❌ Database connection error:', err));

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', profileRoutes);

// Health route
app.get('/health', (req, res) => res.json({ ok: true, message: 'Server is running' }));

// Serve Angular frontend (when built) - using CommonJS __dirname
const clientPath = path.join(__dirname, '../../dist/easyrecovery');
app.use(express.static(clientPath));
// Use regex pattern instead of * for Express 5.x compatibility
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientPath, 'index.html')));

// Start server
app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));