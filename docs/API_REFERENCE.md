# API Reference

Base URL: `http://localhost:3000`. JSON endpoints accept and return JSON unless noted. Authenticated endpoints require the HTTP-only `token` cookie set by login or registration. File upload uses `multipart/form-data`.

## Health

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Confirms the API process is responding. |

## Authentication

| Method | Path | Access | Request |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | `{ "name", "email", "password" }` |
| `POST` | `/api/auth/login` | Public | `{ "email", "password" }` |
| `POST` | `/api/auth/logout` | Authenticated | Clears the authentication cookie. |
| `GET` | `/api/auth/me` | Authenticated | Returns the current user profile. |

## Folders

All folder routes require authentication. `parent_id` may be a folder UUID or `null` for root folders. If omitted from `GET /api/folders`, active folders are returned across the drive.

| Method | Path | Request / query | Description |
| --- | --- | --- | --- |
| `GET` | `/api/folders` | `parent_id` query (optional) | Lists active folders. |
| `POST` | `/api/folders` | `{ "name", "parent_id" }` | Creates a folder. `parent_id` may be `null`. |
| `GET` | `/api/folders/:id` | - | Returns a folder and its breadcrumbs. |
| `PATCH` | `/api/folders/:id/rename` | `{ "name" }` | Renames a folder. |
| `PATCH` | `/api/folders/:id/move` | `{ "target_parent" }` | Moves a folder. Use `null` to move it to the root. |
| `POST` | `/api/folders/:id/restore` | - | Restores a folder from trash. |
| `DELETE` | `/api/folders/:id` | - | Moves a folder and its active contents to trash. |
| `DELETE` | `/api/folders/:id/permanent` | - | Permanently deletes a trashed folder and its contents. |

## Files

Most file routes require authentication. Preview can use an owner cookie or a valid `share_token`; signed content URLs are public until their token expires.

| Method | Path | Request / query | Description |
| --- | --- | --- | --- |
| `GET` | `/api/files` | `folder_id`, `search`, `sort` queries | Lists active files. `folder_id=null` selects root files. |
| `POST` | `/api/files/upload` | Multipart fields `files` (one or more) and optional `folder_id` | Uploads files; quota and per-file size are checked. |
| `GET` | `/api/files/:id/preview` | Optional `share_token` query | Returns signed preview and download URLs when permitted. |
| `GET` | `/api/files/content/:token` | Signed token in path | Streams a preview or download. |
| `PATCH` | `/api/files/:id/rename` | `{ "name" }` | Renames a file. |
| `PATCH` | `/api/files/:id/move` | `{ "target_folder" }` | Moves a file. Use `null` for the drive root. |
| `POST` | `/api/files/:id/restore` | - | Restores a file from trash. |
| `DELETE` | `/api/files/:id` | - | Moves a file to trash. |
| `DELETE` | `/api/files/:id/permanent` | - | Permanently deletes a trashed file. |

## Shares

Creating, listing, and revoking shares requires authentication. Accessing a share link is public. Permissions are `view` or `download`; an optional `expires_at` must be a future date.

| Method | Path | Request | Description |
| --- | --- | --- | --- |
| `POST` | `/api/shares` | `{ "resource_id", "resource_type", "permission?", "expires_at?" }` | Creates or updates a file/folder share. `resource_type` is `file` or `folder`. |
| `GET` | `/api/shares` | - | Lists the current user's active share links. |
| `GET` | `/api/shares/access/:token` | - | Resolves a public share link and returns its permitted resource details. |
| `DELETE` | `/api/shares/:id` | - | Revokes a share link owned by the current user. |

## Trash

All trash routes require authentication.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/trash` | Lists top-level trashed files and folders. |
| `DELETE` | `/api/trash/empty` | Permanently deletes all trashed items for the current user. |

Invalid UUID path parameters return a client error. Missing or inaccessible resources return an error response; server failures use a generic message.
