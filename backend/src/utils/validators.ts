import { body } from 'express-validator';

export const registerSchema = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('display_name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Display name can only contain letters, numbers, spaces, hyphens, and underscores')
];

export const loginSchema = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];
