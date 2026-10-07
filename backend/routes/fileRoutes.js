import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    checkStorageQuota,
    optionalAuth,
    parseUpload,
    validateIdParam,
} from '../middleware/drive.js';
import {
    getFilePreview,
    getFiles,
    moveFile,
    permanentDeleteFile,
    renameFile,
    restoreFile,
    streamFileContent,
    trashFile,
    uploadFiles,
} from '../controllers/fileController.js';

const fileRouter = express.Router();

fileRouter.param('id', validateIdParam);

// Public: signed URL se file stream (img/video/fetch sab chalega)
fileRouter.get('/content/:token', streamFileContent);

fileRouter.get('/', protect, getFiles);
fileRouter.post('/upload', protect, parseUpload, checkStorageQuota, uploadFiles);
fileRouter.get('/:id/preview', optionalAuth, getFilePreview);
fileRouter.patch('/:id/rename', protect, renameFile);
fileRouter.patch('/:id/move', protect, moveFile);
fileRouter.post('/:id/restore', protect, restoreFile);
fileRouter.delete('/:id/permanent', protect, permanentDeleteFile);
fileRouter.delete('/:id', protect, trashFile);

export default fileRouter;