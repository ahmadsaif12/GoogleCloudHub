import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { sql } from '../config/db.js';
import {
    ApiError,
    UPLOAD_ROOT,
    decodeFilename,
    deleteFromDisk,
    isUuid,
    safeFileName,
} from '../utils/helper.js';

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 100;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = 20;

// Files seedha disk par stream hoti hain (RAM me load nahi hoti)
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const dir = path.join(UPLOAD_ROOT, req.user.id);
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename: (_req, file, cb) => {
        const name = safeFileName(decodeFilename(file.originalname));
        cb(null, `${crypto.randomUUID()}-${name}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

const uploadFields = upload.fields([
    { name: 'files', maxCount: MAX_FILES },
    { name: 'file', maxCount: 1 },
]);

//for file upload routes multipart
export const parseUpload = (req, res, next) => {
    uploadFields(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(
                        new ApiError(413, `File too large. Max size is ${MAX_FILE_SIZE_MB} MB`)
                    );
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new ApiError(400, `You can upload up to ${MAX_FILES} files at once`));
                }
                return next(new ApiError(400, err.message));
            }
            return next(err);
        }

        const grouped = req.files || {};
        req.uploadedFiles = [...(grouped.files || []), ...(grouped.file || [])];
        next();
    });
};

const uploadedKeys = (req) =>
    (req.uploadedFiles || []).map((f) => `${req.user.id}/${f.filename}`);

// Storage limit cross ho rahi ho to upload reject + temp files delete
export const checkStorageQuota = async (req, res, next) => {
    try {
        if (!req.uploadedFiles?.length) {
            throw new ApiError(400, 'No files uploaded');
        }

        const incoming = req.uploadedFiles.reduce((sum, f) => sum + f.size, 0);

        const rows = await sql`
            SELECT storage_used, storage_limit
            FROM users
            WHERE id = ${req.user.id}
        `;
        if (!rows.length) throw new ApiError(404, 'User not found');

        const { storage_used, storage_limit } = rows[0];
        if (Number(storage_used) + incoming > Number(storage_limit)) {
            throw new ApiError(413, 'Storage limit exceeded');
        }

        req.incomingBytes = incoming;
        next();
    } catch (error) {
        await deleteFromDisk(uploadedKeys(req));
        next(error);
    }
};

// router.param('id', validateIdParam)
export const validateIdParam = (req, res, next, value) => {
    if (!isUuid(value)) return next(new ApiError(400, 'Invalid id'));
    next();
};

// Valid cookie ho to req.user set karta hai, kabhi block nahi karta
export const optionalAuth = (req, res, next) => {
    const token = req.cookies?.token;
    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            // invalid / expired -> anonymous
        }
    }
    next();
};