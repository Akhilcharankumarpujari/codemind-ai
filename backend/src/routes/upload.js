import { Router } from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/uploadController.js';

export const uploadRouter = Router();

const ALLOWED_EXTS = new Set(['pdf','txt','md','py','js','ts','java','cpp','c','docx']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, 
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ALLOWED_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ".${ext}" is not supported. Allowed: ${[...ALLOWED_EXTS].join(', ')}`));
    }
  },
});

uploadRouter.post('/upload', upload.single('file'), uploadController.uploadFile);
uploadRouter.get('/documents', uploadController.getDocuments);
uploadRouter.delete('/documents/:source', uploadController.deleteDoc);
