import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { emptyTrash, getTrash } from '../controllers/trashController.js';

const trashRouter = express.Router();

trashRouter.use(protect);

trashRouter.get('/', getTrash);
trashRouter.delete('/empty', emptyTrash);

export default trashRouter;