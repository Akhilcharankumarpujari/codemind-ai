import express from 'express';
import * as flowController from '../controllers/flowController.js';

export const flowRouter = express.Router();

flowRouter.post('/flow/generate', flowController.generate);
flowRouter.post('/flow/dryrun', flowController.dryrun);
