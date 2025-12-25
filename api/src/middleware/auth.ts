import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export type AuthedRequest = Request & { userKey?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');

    const payload = jwt.verify(token, secret) as { userKey: string };
    req.userKey = payload.userKey;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
