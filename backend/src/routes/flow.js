import express from 'express';
import * as flowController from '../controllers/flowController.js';

export const flowRouter = express.Router();

flowRouter.post('/flow/generate', flowController.generate);
flowRouter.post('/flow/validate', flowController.validate);
flowRouter.post('/flow/explain', flowController.explain);
flowRouter.post('/flow/dryrun', flowController.dryrun);
