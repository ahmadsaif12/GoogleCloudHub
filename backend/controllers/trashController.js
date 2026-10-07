import { sql } from '../config/db.js';
import { asyncHandler, deleteFromDisk, serializeFile, serializeFolder } from '../utils/helper.js';

// GET /api/trash -> sirf top-level trashed items (nested wale parent ke saath dikhte hain)
export const getTrash = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [folders, files] = await Promise.all([
        sql`
            SELECT f.*
            FROM folders f
            LEFT JOIN folders p ON p.id = f.parent_id
            WHERE f.owner_id = ${userId}
              AND f.is_trashed = TRUE
              AND (p.id IS NULL OR p.is_trashed = FALSE OR p.trashed_at IS DISTINCT FROM f.trashed_at)
            ORDER BY f.trashed_at DESC
        `,
        sql`
            SELECT f.*
            FROM files f
            LEFT JOIN folders p ON p.id = f.folder_id
            WHERE f.owner_id = ${userId}
              AND f.is_trashed = TRUE
              AND (p.id IS NULL OR p.is_trashed = FALSE OR p.trashed_at IS DISTINCT FROM f.trashed_at)
            ORDER BY f.trashed_at DESC
        `,
    ]);

    res.json({
        files: files.map(serializeFile),
        folders: folders.map(serializeFolder),
    });
});

// DELETE /api/trash/empty
export const emptyTrash = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const rows = await sql`
        WITH delf AS (
            DELETE FROM files
            WHERE owner_id = ${userId} AND is_trashed = TRUE
            RETURNING id, size, s3_key
        ),
        deld AS (
            DELETE FROM folders
            WHERE owner_id = ${userId} AND is_trashed = TRUE
            RETURNING id
        ),
        shr AS (
            DELETE FROM share_links
            WHERE owner_id = ${userId}
              AND resource_id IN (
                  SELECT id FROM delf UNION ALL SELECT id FROM deld
              )
        ),
        upd AS (
            UPDATE users
            SET storage_used = GREATEST(
                    0,
                    storage_used - COALESCE((SELECT SUM(size) FROM delf), 0)::bigint
                ),
                updated_at = NOW()
            WHERE id = ${userId}
        )
        SELECT COALESCE((SELECT json_agg(s3_key) FROM delf), '[]'::json) AS keys
    `;

    await deleteFromDisk(rows[0]?.keys || []);

    res.json({ message: 'Trash emptied successfully' });
});