import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validateIdParam } from '../middleware/drive.js';
import {
    accessShare,
    createShare,
    getShares,
    revokeShare,
} from '../controllers/shareController.js';

const shareRouter = express.Router();

shareRouter.param('id', validateIdParam);

shareRouter.get('/access/:token', accessShare); // public
shareRouter.get('/', protect, getShares);
shareRouter.post('/', protect, createShare);
shareRouter.delete('/:id', protect, revokeShare);

export default shareRouter;