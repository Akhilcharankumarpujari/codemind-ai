/**
 * CodeMind AI — Document Upload & Management Routes
 *
 * POST   /api/upload              Upload a PDF or TXT → index in RAG
 * GET    /api/documents           List all indexed documents
 * DELETE /api/documents/:source   Remove a document from the RAG store
 */

import { Router } from 'express';
import multer from 'multer';
import { uploadFileToRag, listDocuments, deleteDocument } from '../services/ragService.js';

export const uploadRouter = Router();

// ── Multer: store uploads in memory (no temp files on disk) ───────────────────
const ALLOWED_EXTS = new Set(['pdf','txt','md','py','js','ts','java','cpp','c','docx']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ALLOWED_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ".${ext}" is not supported. Allowed: ${[...ALLOWED_EXTS].join(', ')}`));
    }
  },
});


// ── POST /api/upload ───────────────────────────────────────────────────────────
/**
 * Accepts a multipart file upload, forwards it to the RAG Python service,
 * which extracts text (PDF via pdfplumber, TXT via UTF-8) and indexes it.
 */
uploadRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Send a PDF or TXT as multipart field "file".' });
    }

    const { buffer, originalname, mimetype } = req.file;
    console.log(`[Upload] Received: ${originalname} (${(buffer.length / 1024).toFixed(1)} KB)`);

    const result = await uploadFileToRag(buffer, originalname, mimetype);

    console.log(`[Upload] Indexed "${result.source}" → ${result.indexed_chunks} chunks`);
    return res.json({
      success: true,
      ...result,
    });

  } catch (err) {
    next(err);
  }
});


// ── GET /api/documents ─────────────────────────────────────────────────────────
/**
 * Proxy to RAG /documents — returns list of all indexed documents.
 */
uploadRouter.get('/documents', async (_req, res, next) => {
  try {
    const data = await listDocuments();
    return res.json(data);
  } catch (err) {
    next(err);
  }
});


// ── DELETE /api/documents/:source ─────────────────────────────────────────────
/**
 * Remove a document from the RAG vector store by its source name.
 */
uploadRouter.delete('/documents/:source', async (req, res, next) => {
  try {
    const { source } = req.params;
    if (!source || source.trim() === '') {
      return res.status(400).json({ error: 'Source name is required.' });
    }
    const result = await deleteDocument(source);
    return res.json(result);
  } catch (err) {
    // 404 from Python service
    if (err.message?.includes('404') || err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});
