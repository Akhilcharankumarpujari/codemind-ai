import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';

export const chatRouter = Router();

chatRouter.post('/chat', chatController.handleChat);
chatRouter.post('/chat/stream', chatController.handleChatStream);
chatRouter.post('/index', chatController.indexDoc);
chatRouter.get('/rag/status', chatController.getRagStatus);
