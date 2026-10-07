import { sql } from '../config/db.js';
import {
    ApiError,
    asyncHandler,
    assertFolderOwned,
    cleanName,
    deleteFromDisk,
    parseNullableId,
    serializeFolder,
} from '../utils/helper.js';

// GET /api/folders?parent_id=<uuid|null>   (parent_id nahi diya -> saare active folders)
export const getFolders = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    let rows;

    if (req.query.parent_id === undefined) {
        rows = await sql`
            SELECT * FROM folders
            WHERE owner_id = ${userId} AND is_trashed = FALSE
            ORDER BY LOWER(name), id
        `;
    } else {
        const parentId = parseNullableId(req.query.parent_id, 'parent_id');
        rows = parentId
            ? await sql`
                SELECT * FROM folders
                WHERE owner_id = ${userId} AND is_trashed = FALSE AND parent_id = ${parentId}
                ORDER BY LOWER(name), id
            `
            : await sql`
                SELECT * FROM folders
                WHERE owner_id = ${userId} AND is_trashed = FALSE AND parent_id IS NULL
                ORDER BY LOWER(name), id
            `;
    }

    res.json({ folders: rows.map(serializeFolder) });
});

// GET /api/folders/:id -> { folder, breadcrumbs }
export const getFolder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const folder = await assertFolderOwned(req.params.id, userId);

    let breadcrumbs = [];
    if (folder.path.length) {
        const rows = await sql`
            SELECT id, name FROM folders
            WHERE owner_id = ${userId} AND id = ANY(${folder.path}::uuid[])
        `;
        const byId = new Map(rows.map((r) => [r.id, r]));
        breadcrumbs = folder.path.map((id) => byId.get(id)).filter(Boolean);
    }

    res.json({ folder, breadcrumbs });
});

// POST /api/folders { name, parent_id }
export const createFolder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const name = cleanName(req.body?.name, 'Folder name');
    const parentId = parseNullableId(req.body?.parent_id, 'parent_id');

    let path = [];
    if (parentId) {
        const parent = await assertFolderOwned(parentId, userId);
        path = [...parent.path, parent.id];
    }

    const rows = await sql`
        INSERT INTO folders (name, parent_id, owner_id, path)
        VALUES (${name}, ${parentId}, ${userId}, ${path}::uuid[])
        RETURNING *
    `;

    res.status(201).json({ folder: serializeFolder(rows[0]) });
});

// PATCH /api/folders/:id/rename { name }
export const renameFolder = asyncHandler(async (req, res) => {
    const name = cleanName(req.body?.name, 'Folder name');

    const rows = await sql`
        UPDATE folders
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${req.params.id}
          AND owner_id = ${req.user.id}
          AND is_trashed = FALSE
        RETURNING *
    `;
    if (!rows.length) throw new ApiError(404, 'Folder not found');

    res.json({ folder: serializeFolder(rows[0]) });
});

// PATCH /api/folders/:id/move { target_parent }
export const moveFolder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const raw =
        req.body?.target_parent !== undefined
            ? req.body.target_parent
            : req.body?.target_parent_id;
    const targetId = parseNullableId(raw, 'target_parent');

    await assertFolderOwned(id, userId);

    let newPrefix = [];
    if (targetId) {
        if (targetId === id) {
            throw new ApiError(400, 'Cannot move a folder into itself');
        }
        const target = await assertFolderOwned(targetId, userId);
        if (target.path.includes(id)) {
            throw new ApiError(400, 'Cannot move a folder into its own subfolder');
        }
        newPrefix = [...target.path, target.id];
    }

    // 1) descendants ka path rewrite  2) folder ko move (ek transaction me)
    const results = await sql.transaction([
        sql`
            UPDATE folders
            SET path = ${newPrefix}::uuid[] || path[array_position(path, ${id}::uuid):],
                updated_at = NOW()
            WHERE owner_id = ${userId} AND ${id}::uuid = ANY(path)
        `,
        sql`
            UPDATE folders
            SET parent_id = ${targetId},
                path = ${newPrefix}::uuid[],
                updated_at = NOW()
            WHERE id = ${id} AND owner_id = ${userId}
            RETURNING *
        `,
    ]);

    res.json({ folder: serializeFolder(results[1][0]) });
});

// DELETE /api/folders/:id -> folder + subfolders + files trash me
export const trashFolder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    await assertFolderOwned(id, userId);

    // Transaction me NOW() same rehta hai, isliye poore subtree ka trashed_at ek jaisa hoga
    await sql.transaction([
        sql`
            UPDATE files
            SET is_trashed = TRUE, trashed_at = NOW(), updated_at = NOW()
            WHERE owner_id = ${userId}
              AND is_trashed = FALSE
              AND folder_id IN (
                  SELECT id FROM folders
                  WHERE owner_id = ${userId}
                    AND (id = ${id}::uuid OR ${id}::uuid = ANY(path))
              )
        `,
        sql`
            UPDATE folders
            SET is_trashed = TRUE, trashed_at = NOW(), updated_at = NOW()
            WHERE owner_id = ${userId}
              AND is_trashed = FALSE
              AND (id = ${id}::uuid OR ${id}::uuid = ANY(path))
        `,
    ]);

    res.json({ message: 'Folder moved to trash' });
});

// POST /api/folders/:id/restore
export const restoreFolder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const found = await sql`
        SELECT * FROM folders
        WHERE id = ${id} AND owner_id = ${userId} AND is_trashed = TRUE
    `;
    if (!found.length) throw new ApiError(404, 'Folder not found in trash');
    const folder = serializeFolder(found[0]);

    // Parent abhi bhi trash me hai to root me restore hoga
    let parentTrashed = false;
    if (folder.parent_id) {
        const parent = await sql`
            SELECT is_trashed FROM folders
            WHERE id = ${folder.parent_id} AND owner_id = ${userId}
        `;
        parentTrashed = !parent.length || parent[0].is_trashed;
    }

    const newParentId = parentTrashed ? null : folder.parent_id;
    const newPrefix = parentTrashed ? [] : folder.path;

    const statements = [];

    if (parentTrashed) {
        statements.push(sql`
            UPDATE folders
            SET path = ${newPrefix}::uuid[] || path[array_position(path, ${id}::uuid):],
                updated_at = NOW()
            WHERE owner_id = ${userId} AND ${id}::uuid = ANY(path)
        `);
    }

    // Sirf wahi items restore honge jo is folder ke saath trash hue the (same trashed_at)
    statements.push(
        sql`
            UPDATE folders
            SET is_trashed = FALSE, trashed_at = NULL, updated_at = NOW()
            WHERE owner_id = ${userId}
              AND is_trashed = TRUE
              AND ${id}::uuid = ANY(path)
              AND trashed_at = (SELECT trashed_at FROM folders WHERE id = ${id}::uuid)
        `,
        sql`
            UPDATE files
            SET is_trashed = FALSE, trashed_at = NULL, updated_at = NOW()
            WHERE owner_id = ${userId}
              AND is_trashed = TRUE
              AND trashed_at = (SELECT trashed_at FROM folders WHERE id = ${id}::uuid)
              AND folder_id IN (
                  SELECT id FROM folders
                  WHERE owner_id = ${userId}
                    AND (id = ${id}::uuid OR ${id}::uuid = ANY(path))
              )
        `,
        sql`
            UPDATE folders
            SET is_trashed = FALSE,
                trashed_at = NULL,
                parent_id = ${newParentId},
                path = ${newPrefix}::uuid[],
                updated_at = NOW()
            WHERE id = ${id} AND owner_id = ${userId}
            RETURNING *
        `
    );

    const results = await sql.transaction(statements);
    const restored = results[results.length - 1][0];

    res.json({ folder: serializeFolder(restored) });
});

// DELETE /api/folders/:id/permanent (folder trash me hona chahiye)
export const permanentDeleteFolder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const rows = await sql`
        WITH sub AS (
            SELECT id FROM folders
            WHERE owner_id = ${userId}
              AND (id = ${id}::uuid OR ${id}::uuid = ANY(path))
              AND EXISTS (
                  SELECT 1 FROM folders
                  WHERE id = ${id}::uuid AND owner_id = ${userId} AND is_trashed = TRUE
              )
        ),
        delf AS (
            DELETE FROM files
            WHERE owner_id = ${userId} AND folder_id IN (SELECT id FROM sub)
            RETURNING id, size, s3_key
        ),
        shr AS (
            DELETE FROM share_links
            WHERE owner_id = ${userId}
              AND resource_id IN (
                  SELECT id FROM delf UNION ALL SELECT id FROM sub
              )
        ),
        deld AS (
            DELETE FROM folders WHERE id IN (SELECT id FROM sub) RETURNING id
        ),
        upd AS (
            UPDATE users
            SET storage_used = GREATEST(
                    0,
                    storage_used - COALESCE((SELECT SUM(size) FROM delf), 0)::bigint
                ),
                updated_at = NOW()
            WHERE id = ${userId} AND EXISTS (SELECT 1 FROM sub)
        )
        SELECT
            (SELECT COUNT(*) FROM deld)::int AS folders_deleted,
            COALESCE((SELECT json_agg(s3_key) FROM delf), '[]'::json) AS keys
    `;

    if (!rows[0] || rows[0].folders_deleted === 0) {
        throw new ApiError(404, 'Folder not found in trash');
    }

    await deleteFromDisk(rows[0].keys);

    res.json({ message: 'Folder permanently deleted' });
});