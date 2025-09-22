import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('display_name').isLength({ min: 2, max: 50 }).withMessage('Display name must be between 2 and 50 characters'),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, display_name } = req.body;
    
    const authService = new AuthService(req.app.locals.db);
    const result = await authService.register(email, password, display_name);
    
    logger.info(`User registered: ${email}`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        display_name: result.user.display_name,
        role: result.user.role,
        is_verified: result.user.is_verified,
        reputation: result.user.reputation,
        credits_balance: result.user.credits_balance,
        created_at: result.user.created_at
      },
      access_token: result.accessToken,
      refresh_token: result.refreshToken
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    
    const authService = new AuthService(req.app.locals.db);
    const result = await authService.login(email, password);
    
    logger.info(`User logged in: ${email}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        display_name: result.user.display_name,
        role: result.user.role,
        is_verified: result.user.is_verified,
        reputation: result.user.reputation,
        credits_balance: result.user.credits_balance,
        created_at: result.user.created_at
      },
      access_token: result.accessToken,
      refresh_token: result.refreshToken
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', [
  body('refresh_token').notEmpty().withMessage('Refresh token is required'),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { refresh_token } = req.body;
    
    const authService = new AuthService(req.app.locals.db);
    const result = await authService.refreshToken(refresh_token);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      access_token: result.accessToken,
      refresh_token: result.refreshToken
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const authService = new AuthService(req.app.locals.db);
    const user = await authService.getCurrentUser(req.userId!);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        location: user.location,
        genres: user.genres,
        role: user.role,
        is_verified: user.is_verified,
        reputation: user.reputation,
        credits_balance: user.credits_balance,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    logger.error('Get current user error:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'User not found'
    });
  }
});

// Update profile endpoint
router.patch('/me/profile', [
  authenticateToken,
  body('display_name').optional().isLength({ min: 2, max: 50 }),
  body('bio').optional().isLength({ max: 500 }),
  body('location').optional().isLength({ max: 100 }),
  body('genres').optional().isArray(),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const authService = new AuthService(req.app.locals.db);
    const user = await authService.updateProfile(req.userId!, req.body);
    
    logger.info(`Profile updated for user: ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        location: user.location,
        genres: user.genres,
        role: user.role,
        is_verified: user.is_verified,
        reputation: user.reputation,
        credits_balance: user.credits_balance,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    logger.error('Profile update error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Profile update failed'
    });
  }
});

// Change password endpoint
router.post('/me/change-password', [
  authenticateToken,
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validateRequest
], async (req: express.Request, res: express.Response) => {
  try {
    const { current_password, new_password } = req.body;
    
    const authService = new AuthService(req.app.locals.db);
    await authService.changePassword(req.userId!, current_password, new_password);
    
    logger.info(`Password changed for user: ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    logger.error('Password change error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Password change failed'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    // In a more sophisticated system, you might want to blacklist the token
    // For now, we'll just return success
    logger.info(`User logged out: ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Authentication middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; type: string };
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

export default router;
