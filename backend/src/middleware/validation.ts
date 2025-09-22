import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

type ValidationSource = 'body' | 'query' | 'params';

export const validate = (schema: Joi.ObjectSchema, source: ValidationSource = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[source], { abortEarly: false, allowUnknown: true });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      logger.warn(`Validation error in ${source}: ${errors.join(', ')}`);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors 
      });
    }

    next();
  };

// Auth schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  display_name: Joi.string().min(3).max(30).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Track schemas
export const createTrackSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  main_genre: Joi.string().max(50).optional(),
  visibility: Joi.string().valid('public', 'private', 'trade_only', 'promo').default('private'),
});

export const uploadInitSchema = Joi.object({
  file_type: Joi.string().valid('wav', 'mp3', 'aiff', 'flac').required(),
  file_name: Joi.string().min(1).max(255).required(),
  file_size: Joi.number().integer().min(1).max(200 * 1024 * 1024).required(),
});

export const uploadCompleteSchema = Joi.object({
  upload_id: Joi.string().uuid().required(),
  s3_key: Joi.string().min(1).max(500).required(),
  duration_ms: Joi.number().integer().min(1000).max(3600000).optional(),
  sample_rate: Joi.number().integer().valid(44100, 48000, 88200, 96000).optional(),
  channels: Joi.number().integer().min(1).max(2).optional(),
  price_cents: Joi.number().integer().min(0).max(100000).optional(),
  is_preview: Joi.boolean().default(false),
});

// Trade schemas
export const createTradeSchema = Joi.object({
  receiver_id: Joi.string().uuid().required(),
  items: Joi.array().items(Joi.object({
    track_file_id: Joi.string().uuid().optional(),
    credits_offered: Joi.number().integer().min(0).default(0),
    cash_offered_cents: Joi.number().integer().min(0).max(100000).default(0),
    note: Joi.string().max(500).optional(),
  })).min(1).required(),
  requested_items: Joi.array().items(Joi.object({
    track_file_id: Joi.string().uuid().required(),
  })).min(1).required(),
  expires_in_seconds: Joi.number().integer().min(300).max(604800).default(86400),
});

export const respondToTradeSchema = Joi.object({
  action: Joi.string().valid('accept', 'decline', 'counter').required(),
  counter_items: Joi.array().items(Joi.object({
    track_file_id: Joi.string().uuid().optional(),
    credits_offered: Joi.number().integer().min(0).default(0),
    cash_offered_cents: Joi.number().integer().min(0).max(100000).default(0),
    note: Joi.string().max(500).optional(),
  })).optional(),
});

// Payment schemas
export const createPurchaseSchema = Joi.object({
  track_file_id: Joi.string().uuid().required(),
  payment_method_id: Joi.string().min(1).max(100).required(),
});

export const addCreditsSchema = Joi.object({
  amount_cents: Joi.number().integer().min(100).max(100000).required(),
  payment_method_id: Joi.string().min(1).max(100).required(),
});

export const transferCreditsSchema = Joi.object({
  to_user_id: Joi.string().uuid().required(),
  amount: Joi.number().integer().min(1).max(100000).required(),
  reason: Joi.string().max(200).optional(),
});

// Group schemas
export const groupSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  is_private: Joi.boolean().default(true),
  invite_ids: Joi.array().items(Joi.string().uuid()).optional(),
});

export const messageSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
  attachments: Joi.array().items(Joi.object({
    type: Joi.string().valid('image', 'file', 'track').required(),
    url: Joi.string().uri().required(),
    name: Joi.string().max(255).optional(),
  })).optional(),
});

// Search schemas
export const searchSchema = Joi.object({
  q: Joi.string().max(100).optional(),
  bpm_min: Joi.number().integer().min(60).max(200).optional(),
  bpm_max: Joi.number().integer().min(60).max(200).optional(),
  key: Joi.string().max(10).optional(),
  genre: Joi.string().max(50).optional(),
  price_min: Joi.number().integer().min(0).max(100000).optional(),
  price_max: Joi.number().integer().min(0).max(100000).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sort: Joi.string().valid('created_at', '-created_at', 'title', '-title', 'bpm', '-bpm', 'price', '-price').default('-created_at'),
});

// Profile schemas
export const updateProfileSchema = Joi.object({
  display_name: Joi.string().min(3).max(30).optional(),
  bio: Joi.string().max(500).optional(),
  avatar_url: Joi.string().uri().optional(),
  location: Joi.string().max(100).optional(),
  genres: Joi.array().items(Joi.string().max(50)).max(10).optional(),
});