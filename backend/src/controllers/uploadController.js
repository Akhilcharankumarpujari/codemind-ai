import { uploadFileToRag, listDocuments, deleteDocument } from '../services/ragService.js';

export const uploadFile = async (req, res, next) => {
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
};

export const getDocuments = async (_req, res, next) => {
  try {
    const data = await listDocuments();
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

export const deleteDoc = async (req, res, next) => {
  try {
    const { source } = req.params;
    if (!source || source.trim() === '') {
      return res.status(400).json({ error: 'Source name is required.' });
    }
    const result = await deleteDocument(source);
    return res.json(result);
  } catch (err) {
    if (err.message?.includes('404') || err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
};
