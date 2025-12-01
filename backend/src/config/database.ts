import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase pooler connections (both ports 5432 and 6543) work without SSL in session mode
  ssl: {
    rejectUnauthorized: false // Required for Supabase (allows self-signed certs)
  },
  max: 10,
  idleTimeoutMillis: 10000, // Close idle connections after 1 second (Fixes the "Shutdown" error)
  connectionTimeoutMillis: 30000,
});

pool.on('connect', () => {
  console.log('Connected to Supabase PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export default pool;