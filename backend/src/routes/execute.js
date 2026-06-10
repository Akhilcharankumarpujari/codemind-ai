import { Router } from 'express';
import * as executeController from '../controllers/executeController.js';

export const executeRouter = Router();

executeRouter.post('/execute', executeController.execute);
