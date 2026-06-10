import { Router } from 'express';
import * as analyzeController from '../controllers/analyzeController.js';

export const analyzeRouter = Router();

analyzeRouter.post('/analyze', analyzeController.analyze);
