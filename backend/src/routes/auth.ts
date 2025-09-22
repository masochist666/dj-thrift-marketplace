import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username } = req.body;
    const dbService = new DatabaseService();
    const authService = new AuthService(dbService);

    const result = await authService.register(email, password, username);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username
      },
      token: result.token
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const dbService = new DatabaseService();
    const authService = new AuthService(dbService);

    const result = await authService.login(email, password);
    
    res.json({
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username
      },
      token: result.token
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: any, res: Response) => {
  try {
    const dbService = new DatabaseService();
    const user = await dbService.getKnex()('users')
      .select('id', 'email', 'username', 'created_at')
      .where('id', req.user.id)
      .first();

    const profile = await dbService.getKnex()('profiles')
      .where('user_id', req.user.id)
      .first();

    res.json({
      user: {
        ...user,
        profile
      }
    });
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req: any, res: Response) => {
  res.json({ message: 'Logout successful' });
});

export default router;