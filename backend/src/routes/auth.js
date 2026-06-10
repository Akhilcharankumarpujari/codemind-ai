import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post('/auth/register', authController.register);
authRouter.post('/auth/login', authController.login);
authRouter.post('/auth/logout', authController.logout);
authRouter.get('/auth/me', requireAuth, authController.me);
