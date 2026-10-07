import { sql } from '../config/db.js';
import {
    ApiError,
    asyncHandler,
    findValidShare,
    generateShareToken,
    getBaseUrl,
    isUuid,
    serializeFile,
    serializeFolder,
    signFileUrl,
} from '../utils/helper.js';

const PERMISSIONS = ['view', 'download'];
const RESOURCE_TYPES = ['file', 'folder'];

// Owner ka internal data (owner_id) bahar nahi bhejte
const publicShare = (share) => ({
    id: share.id,
    token: share.token,
    resource_type: share.resource_type,
    resource_id: share.resource_id,
    permission: share.permission,
    expires_at: share.expires_at,
    access_count: share.access_count,
    created_at: share.created_at,
    updated_at: share.updated_at,
});

// POST /api/shares { resource_id, resource_type, permission?, expires_at? }
export const createShare = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { resource_id: resourceId, resource_type: resourceType } = req.body || {};

    if (!RESOURCE_TYPES.includes(resourceType)) {
        throw new ApiError(400, 'resource_type must be "file" or "folder"');
    }
    if (!isUuid(resourceId)) {
        throw new ApiError(400, 'Invalid resource_id');
    }

    const permission = req.body.permission ?? null;
    if (permission !== null && !PERMISSIONS.includes(permission)) {
        throw new ApiError(400, 'permission must be "view" or "download"');
    }

    const hasExpiry = Object.prototype.hasOwnProperty.call(req.body, 'expires_at');
    let expiresAt = null;
    if (hasExpiry && req.body.expires_at) {
        const date = new Date(req.body.expires_at);
        if (Number.isNaN(date.getTime()) || date <= new Date()) {
            throw new ApiError(400, 'expires_at must be a valid future date');
        }
        expiresAt = date.toISOString();
    }

    // Resource user ka hona chahiye aur trash me nahi
    const owned =
        resourceType === 'file'
            ? await sql`
                SELECT id FROM files
                WHERE id = ${resourceId} AND owner_id = ${userId} AND is_trashed = FALSE
            `
            : await sql`
                SELECT id FROM folders
                WHERE id = ${resourceId} AND owner_id = ${userId} AND is_trashed = FALSE
            `;
    if (!owned.length) throw new ApiError(404, `${resourceType === 'file' ? 'File' : 'Folder'} not found`);

    // Pehle se link hai to wahi return hota hai (unique: resource_id + owner_id)
    const rows = await sql`
        INSERT INTO share_links (token, resource_type, resource_id, owner_id, permission, expires_at)
        VALUES (
            ${generateShareToken()},
            ${resourceType},
            ${resourceId},
            ${userId},
            ${permission || 'download'},
            ${expiresAt}
        )
        ON CONFLICT (resource_id, owner_id) DO UPDATE SET
            permission = COALESCE(${permission}::varchar, share_links.permission),
            expires_at = CASE WHEN ${hasExpiry}::boolean THEN ${expiresAt}::timestamptz
                              ELSE share_links.expires_at END,
            updated_at = NOW()
        RETURNING *, (xmax = 0) AS inserted
    `;

    const { inserted, ...share } = rows[0];

    res.status(inserted ? 201 : 200).json({
        share,
        share_link: share,
        is_existing: !inserted,
    });
});

// GET /api/shares -> user ke saare active share links (resource info ke saath)
export const getShares = asyncHandler(async (req, res) => {
    const rows = await sql`
        SELECT
            s.*,
            (s.expires_at IS NOT NULL AND s.expires_at <= NOW()) AS is_expired,
            CASE
                WHEN s.resource_type = 'file' THEN json_build_object(
                    'id', f.id, 'name', f.name, 'mime_type', f.mime_type, 'size', f.size
                )
                ELSE json_build_object(
                    'id', d.id, 'name', d.name, 'mime_type', NULL
                )
            END AS resource
        FROM share_links s
        LEFT JOIN files f   ON s.resource_type = 'file'   AND f.id = s.resource_id
        LEFT JOIN folders d ON s.resource_type = 'folder' AND d.id = s.resource_id
        WHERE s.owner_id = ${req.user.id}
          AND (
              (s.resource_type = 'file'   AND f.id IS NOT NULL AND f.is_trashed = FALSE) OR
              (s.resource_type = 'folder' AND d.id IS NOT NULL AND d.is_trashed = FALSE)
          )
        ORDER BY s.created_at DESC
    `;

    const shareLinks = rows.map(({ owner_id: _owner, ...share }) => share);

    res.json({ share_links: shareLinks, shares: shareLinks });
});

// DELETE /api/shares/:id
export const revokeShare = asyncHandler(async (req, res) => {
    const rows = await sql`
        DELETE FROM share_links
        WHERE id = ${req.params.id} AND owner_id = ${req.user.id}
        RETURNING id
    `;
    if (!rows.length) throw new ApiError(404, 'Share link not found');

    res.json({ message: 'Share link revoked' });
});

// GET /api/shares/access/:token  (public, login nahi chahiye)
export const accessShare = asyncHandler(async (req, res) => {
    const share = await findValidShare(req.params.token);
    const baseUrl = getBaseUrl(req);

    const [updated, owners] = await Promise.all([
        sql`
            UPDATE share_links
            SET access_count = access_count + 1
            WHERE id = ${share.id}
            RETURNING *
        `,
        sql`SELECT name FROM users WHERE id = ${share.owner_id}`,
    ]);

    const base = {
        share: publicShare(updated[0]),
        resource_type: share.resource_type,
        permission: share.permission,
        owner: { name: owners[0]?.name || 'Unknown' },
    };

    if (share.resource_type === 'file') {
        const rows = await sql`
            SELECT * FROM files WHERE id = ${share.resource_id} AND is_trashed = FALSE
        `;
        if (!rows.length) throw new ApiError(404, 'Share link not found');

        const file = rows[0];
        const previewUrl = signFileUrl(baseUrl, file);

        return res.json({
            ...base,
            file: serializeFile(file),
            preview_url: previewUrl,
            url: previewUrl,
            download_url:
                share.permission === 'view'
                    ? null
                    : signFileUrl(baseUrl, file, { download: true }),
        });
    }

    const [folderRows, files, folders] = await Promise.all([
        sql`SELECT * FROM folders WHERE id = ${share.resource_id} AND is_trashed = FALSE`,
        sql`
            SELECT * FROM files
            WHERE owner_id = ${share.owner_id}
              AND folder_id = ${share.resource_id}
              AND is_trashed = FALSE
            ORDER BY LOWER(name), id
        `,
        sql`
            SELECT * FROM folders
            WHERE owner_id = ${share.owner_id}
              AND parent_id = ${share.resource_id}
              AND is_trashed = FALSE
            ORDER BY LOWER(name), id
        `,
    ]);
    if (!folderRows.length) throw new ApiError(404, 'Share link not found');

    const { owner_id: _owner, ...folder } = serializeFolder(folderRows[0]);

    res.json({
        ...base,
        folder,
        files: files.map(serializeFile),
        folders: folders.map(({ owner_id: _o, ...f }) => serializeFolder(f)),
    });
});