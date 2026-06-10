import { Router } from 'express';
import * as complexityController from '../controllers/complexityController.js';

export const complexityRouter = Router();

complexityRouter.post('/complexity/analyze', complexityController.analyzeComplexity);
