import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validateIdParam } from '../middleware/drive.js';
import {
    createFolder,
    getFolder,
    getFolders,
    moveFolder,
    permanentDeleteFolder,
    renameFolder,
    restoreFolder,
    trashFolder,
} from '../controllers/folderController.js';

const folderRouter = express.Router();

folderRouter.param('id', validateIdParam);
folderRouter.use(protect);

folderRouter.get('/', getFolders);
folderRouter.post('/', createFolder);
folderRouter.get('/:id', getFolder);
folderRouter.patch('/:id/rename', renameFolder);
folderRouter.patch('/:id/move', moveFolder);
folderRouter.post('/:id/restore', restoreFolder);
folderRouter.delete('/:id/permanent', permanentDeleteFolder);
folderRouter.delete('/:id', trashFolder);

export default folderRouter;