import { sql } from '../config/db.js';
import {
    ApiError,
    asyncHandler,
    assertFolderOwned,
    cleanName,
    contentDisposition,
    decodeFilename,
    deleteFromDisk,
    escapeLike,
    findValidShare,
    getBaseUrl,
    getFileOrderBy,
    parseNullableId,
    resolveStoragePath,
    serializeFile,
    shareCoversFile,
    signFileUrl,
    verifyFileToken,
} from '../utils/helper.js';

// GET /api/files?folder_id=<uuid|null>&search=&sort=
export const getFiles = asyncHandler(async (req, res) => {
    const { folder_id, search, sort } = req.query;
    const params = [req.user.id];
    let where = 'owner_id = $1 AND is_trashed = FALSE';

    if (folder_id !== undefined) {
        const folderId = parseNullableId(folder_id, 'folder_id');
        if (folderId === null) {
            where += ' AND folder_id IS NULL';
        } else {
            params.push(folderId);
            where += ` AND folder_id = $${params.length}`;
        }
    }

    if (typeof search === 'string' && search.trim()) {
        params.push(`%${escapeLike(search.trim())}%`);
        where += ` AND name ILIKE $${params.length}`;
    }

    const rows = await sql.query(
        `SELECT * FROM files WHERE ${where} ORDER BY ${getFileOrderBy(sort)}`,
        params
    );

    res.json({ files: rows.map(serializeFile) });
});

// POST /api/files/upload  (multipart: files[], folder_id)
export const uploadFiles = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const keys = req.uploadedFiles.map((f) => `${userId}/${f.filename}`);

    try {
        const folderId = parseNullableId(req.body?.folder_id, 'folder_id');
        if (folderId) await assertFolderOwned(folderId, userId);

        // $1 = owner, $2 = folder, baaki har file ke 4 params
        const params = [userId, folderId];
        const values = req.uploadedFiles.map((file, i) => {
            const name = decodeFilename(file.originalname);
            const mime = (file.mimetype || 'application/octet-stream').slice(0, 128);
            const base = params.length;
            params.push(name, mime, file.size, keys[i]);
            return `($${base + 1}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $2::uuid, $1::uuid)`;
        });

        // Insert + storage_used update ek hi statement (atomic)
        const rows = await sql.query(
            `
            WITH ins AS (
                INSERT INTO files (name, original_name, mime_type, size, s3_key, folder_id, owner_id)
                VALUES ${values.join(', ')}
                RETURNING *
            ),
            upd AS (
                UPDATE users
                SET storage_used = storage_used + (SELECT COALESCE(SUM(size), 0) FROM ins)::bigint,
                    updated_at = NOW()
                WHERE id = $1::uuid
            )
            SELECT * FROM ins
            `,
            params
        );

        const files = rows.map(serializeFile);
        res.status(201).json({ files, file: files[0] });
    } catch (error) {
        await deleteFromDisk(keys); // DB fail / invalid folder -> disk se bhi hata do
        throw error;
    }
});

// GET /api/files/:id/preview  (owner cookie ya ?share_token=)
export const getFilePreview = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const rows = await sql`SELECT * FROM files WHERE id = ${id} AND is_trashed = FALSE`;
    const file = rows[0];
    if (!file) throw new ApiError(404, 'File not found');

    const isOwner = req.user?.id === file.owner_id;
    let share = null;

    if (!isOwner) {
        const token = req.query.share_token || req.get('x-share-token');
        if (!token) {
            throw req.user
                ? new ApiError(404, 'File not found')
                : new ApiError(401, 'Authentication required');
        }
        share = await findValidShare(token);
        if (!(await shareCoversFile(share, file))) {
            throw new ApiError(404, 'File not found');
        }
    }

    const canDownload = isOwner || share.permission !== 'view';
    const baseUrl = getBaseUrl(req);
    const previewUrl = signFileUrl(baseUrl, file);

    res.json({
        preview_url: previewUrl,
        url: previewUrl,
        download_url: canDownload ? signFileUrl(baseUrl, file, { download: true }) : null,
        file: serializeFile(file),
    });
});

// GET /api/files/content/:token  (public, signed URL se file stream hoti hai)
export const streamFileContent = asyncHandler(async (req, res, next) => {
    const { fid, dl } = verifyFileToken(req.params.token);

    const rows = await sql`SELECT * FROM files WHERE id = ${fid} AND is_trashed = FALSE`;
    const file = rows[0];
    if (!file) throw new ApiError(404, 'File not found');

    // HTML/SVG ko inline serve nahi karte (same origin XSS se bachne ke liye)
    const risky = /^(text\/html|image\/svg\+xml|application\/xhtml\+xml)/i.test(file.mime_type);
    const contentType = risky && !dl ? 'text/plain; charset=utf-8' : file.mime_type;

    res.sendFile(
        resolveStoragePath(file.s3_key),
        {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': contentDisposition(dl ? 'attachment' : 'inline', file.name),
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'private, max-age=600',
            },
        },
        (err) => {
            if (err && !res.headersSent) {
                next(new ApiError(404, 'File not found on storage'));
            }
        }
    );
});

// PATCH /api/files/:id/rename { name }
export const renameFile = asyncHandler(async (req, res) => {
    const name = cleanName(req.body?.name, 'File name');

    const rows = await sql`
        UPDATE files
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${req.params.id}
          AND owner_id = ${req.user.id}
          AND is_trashed = FALSE
        RETURNING *
    `;
    if (!rows.length) throw new ApiError(404, 'File not found');

    res.json({ file: serializeFile(rows[0]) });
});

// PATCH /api/files/:id/move { target_folder }
export const moveFile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const raw =
        req.body?.target_folder !== undefined
            ? req.body.target_folder
            : req.body?.target_folder_id;
    const targetId = parseNullableId(raw, 'target_folder');

    if (targetId) await assertFolderOwned(targetId, userId);

    const rows = await sql`
        UPDATE files
        SET folder_id = ${targetId}, updated_at = NOW()
        WHERE id = ${req.params.id}
          AND owner_id = ${userId}
          AND is_trashed = FALSE
        RETURNING *
    `;
    if (!rows.length) throw new ApiError(404, 'File not found');

    res.json({ file: serializeFile(rows[0]) });
});

// DELETE /api/files/:id -> trash me
export const trashFile = asyncHandler(async (req, res) => {
    const rows = await sql`
        UPDATE files
        SET is_trashed = TRUE, trashed_at = NOW(), updated_at = NOW()
        WHERE id = ${req.params.id}
          AND owner_id = ${req.user.id}
          AND is_trashed = FALSE
        RETURNING id
    `;
    if (!rows.length) throw new ApiError(404, 'File not found');

    res.json({ message: 'File moved to trash' });
});

// POST /api/files/:id/restore
export const restoreFile = asyncHandler(async (req, res) => {
    // Folder abhi trash me hai to file root me restore hogi
    const rows = await sql`
        UPDATE files
        SET is_trashed = FALSE,
            trashed_at = NULL,
            updated_at = NOW(),
            folder_id = CASE
                WHEN folder_id IN (SELECT id FROM folders WHERE is_trashed = TRUE)
                    THEN NULL
                ELSE folder_id
            END
        WHERE id = ${req.params.id}
          AND owner_id = ${req.user.id}
          AND is_trashed = TRUE
        RETURNING *
    `;
    if (!rows.length) throw new ApiError(404, 'File not found in trash');

    res.json({ file: serializeFile(rows[0]) });
});

// DELETE /api/files/:id/permanent (file trash me honi chahiye)
export const permanentDeleteFile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const rows = await sql`
        WITH del AS (
            DELETE FROM files
            WHERE id = ${req.params.id}
              AND owner_id = ${userId}
              AND is_trashed = TRUE
            RETURNING id, size, s3_key
        ),
        shr AS (
            DELETE FROM share_links
            WHERE owner_id = ${userId} AND resource_id IN (SELECT id FROM del)
        ),
        upd AS (
            UPDATE users
            SET storage_used = GREATEST(
                    0,
                    storage_used - COALESCE((SELECT SUM(size) FROM del), 0)::bigint
                ),
                updated_at = NOW()
            WHERE id = ${userId} AND EXISTS (SELECT 1 FROM del)
        )
        SELECT s3_key FROM del
    `;
    if (!rows.length) throw new ApiError(404, 'File not found in trash');

    await deleteFromDisk([rows[0].s3_key]);

    res.json({ message: 'File permanently deleted' });
});