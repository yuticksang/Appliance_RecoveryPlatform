import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string | null;
    username: string;
    userType: string;
    buyerId?: string | null;
    sellerId?: string | null;
    adminId?: string | null;
  };
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'] as string | undefined;
  console.log('🔑 Received Authorization header:', authHeader);

  if (!authHeader) {
    console.log('❌ No authorization header found');
    return res.status(401).json({ message: 'No token provided' });
  }

  // Extract token after "Bearer "
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ Bearer token missing after header');
    return res.status(401).json({ message: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log('✅ Token decoded successfully:', decoded);
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};
