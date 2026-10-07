import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sql } from '../config/db.js';

/* ------------------------------------------------------------------ */
/* Errors / async                                                      */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------------------ */
/* Validation / parsing                                                */
/* ------------------------------------------------------------------ */

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) =>
    typeof value === 'string' && UUID_REGEX.test(value);

// "null", "", null, undefined -> null | valid uuid -> uuid | else 400
export const parseNullableId = (value, field = 'id') => {
    if (value === undefined || value === null || value === '' || value === 'null') {
        return null;
    }
    if (!isUuid(value)) {
        throw new ApiError(400, `Invalid ${field}`);
    }
    return value;
};

export const cleanName = (value, label = 'Name') => {
    if (typeof value !== 'string' || !value.trim()) {
        throw new ApiError(400, `${label} is required`);
    }
    const name = value.trim();
    if (name.length > 255) {
        throw new ApiError(400, `${label} must be 255 characters or less`);
    }
    if (/[\\/\u0000-\u001f]/.test(name) || name === '.' || name === '..') {
        throw new ApiError(400, `${label} contains invalid characters`);
    }
    return name;
};

// Escape % _ \ for ILIKE
export const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

// Multer gives latin1 decoded names; convert back to utf8
export const decodeFilename = (name = 'file') => {
    let decoded = name;
    try {
        decoded = Buffer.from(name, 'latin1').toString('utf8');
        if (decoded.includes('\uFFFD')) decoded = name;
    } catch {
        decoded = name;
    }
    decoded = decoded.replace(/[\\/\u0000-\u001f]/g, '_').trim().slice(0, 255);
    return decoded || 'file';
};

const SORT_MAP = {
    name_asc: 'LOWER(name) ASC, id',
    name_desc: 'LOWER(name) DESC, id',
    date_asc: 'created_at ASC, id',
    date_desc: 'created_at DESC, id',
    size_asc: 'size ASC, id',
    size_desc: 'size DESC, id',
};

export const getFileOrderBy = (sort) => SORT_MAP[sort] || SORT_MAP.name_asc;

/* ------------------------------------------------------------------ */
/* Serializers                                                         */
/* ------------------------------------------------------------------ */

const normalizePath = (value) => {
    if (Array.isArray(value)) return value;
    return String(value || '{}').replace(/[{}]/g, '').split(',').filter(Boolean);
};

// Storage path client ko kabhi nahi bhejte; BIGINT -> Number
export const serializeFile = (row) => {
    const { s3_key: _storageKey, ...file } = row;
    return { ...file, size: Number(file.size) };
};

export const serializeFolder = (row) => ({
    ...row,
    path: normalizePath(row.path),
});

/* ------------------------------------------------------------------ */
/* DB helpers                                                          */
/* ------------------------------------------------------------------ */

// Active (non trashed) folder jo user ka ho, warna 404
export const assertFolderOwned = async (folderId, userId) => {
    const rows = await sql`
        SELECT *
        FROM folders
        WHERE id = ${folderId}
          AND owner_id = ${userId}
          AND is_trashed = FALSE
    `;
    if (!rows.length) throw new ApiError(404, 'Folder not found');
    return serializeFolder(rows[0]);
};

/* ------------------------------------------------------------------ */
/* Share helpers                                                       */
/* ------------------------------------------------------------------ */

export const generateShareToken = () => crypto.randomBytes(32).toString('hex'); // 64 chars

// Share link jiska target abhi bhi exist kare, trashed na ho, expire na hua ho
export const findValidShare = async (token) => {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
        throw new ApiError(404, 'Share link not found');
    }

    const rows = await sql`
        SELECT s.*,
            CASE
                WHEN s.resource_type = 'file' THEN EXISTS (
                    SELECT 1 FROM files f
                    WHERE f.id = s.resource_id AND f.is_trashed = FALSE
                )
                ELSE EXISTS (
                    SELECT 1 FROM folders d
                    WHERE d.id = s.resource_id AND d.is_trashed = FALSE
                )
            END AS resource_active
        FROM share_links s
        WHERE s.token = ${token}
    `;

    const share = rows[0];
    if (!share || !share.resource_active) {
        throw new ApiError(404, 'Share link not found');
    }
    if (share.expires_at && new Date(share.expires_at) <= new Date()) {
        throw new ApiError(410, 'This share link has expired');
    }
    return share;
};

// Kya ye share is file tak access deta hai (direct ya shared folder tree se)?
export const shareCoversFile = async (share, file) => {
    if (share.resource_type === 'file') return share.resource_id === file.id;
    if (!file.folder_id) return false;

    const rows = await sql`
        SELECT 1
        FROM folders
        WHERE id = ${file.folder_id}
          AND owner_id = ${share.owner_id}
          AND is_trashed = FALSE
          AND (id = ${share.resource_id}::uuid OR ${share.resource_id}::uuid = ANY(path))
        LIMIT 1
    `;
    return rows.length > 0;
};

/* ------------------------------------------------------------------ */
/* Local disk storage                                                  */
/* ------------------------------------------------------------------ */

export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || 'uploads');

export const safeFileName = (name) =>
    name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);

// DB me "s3_key" column ab local relative path rakhta hai: "<userId>/<uuid>-<name>"
export const resolveStoragePath = (key) => {
    const full = path.resolve(UPLOAD_ROOT, key);
    if (!full.startsWith(UPLOAD_ROOT + path.sep)) {
        throw new ApiError(400, 'Invalid file path');
    }
    return full;
};

// Best effort: fail hone par sirf log karta hai
export const deleteFromDisk = async (keys = []) => {
    await Promise.all(
        keys.filter(Boolean).map(async (key) => {
            try {
                await fs.unlink(resolveStoragePath(key));
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('File delete failed:', error);
                }
            }
        })
    );
};

/* ------------------------------------------------------------------ */
/* Signed file URLs (no cloud, signed with JWT_SECRET)                 */
/* ------------------------------------------------------------------ */

export const getBaseUrl = (req) =>
    process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

export const signFileUrl = (baseUrl, file, { download = false, expiresIn = '15m' } = {}) => {
    const token = jwt.sign(
        { fid: file.id, dl: download, purpose: 'file' },
        process.env.JWT_SECRET,
        { expiresIn }
    );
    return `${baseUrl}/api/files/content/${token}`;
};

export const verifyFileToken = (token) => {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload.purpose !== 'file') throw new Error('wrong token');
        return payload;
    } catch {
        throw new ApiError(401, 'Link expired or invalid');
    }
};

export const contentDisposition = (type, filename) => {
    const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    const encoded = encodeURIComponent(filename).replace(
        /['()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
    return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
};