import { format } from 'date-fns'
import { getFileIcon, formatBytes } from '../../assets/assets'
import { ItemDropdown } from '../ui/ItemDropdown'

const FileCard = ({
  file,
  onPreview,
  onShare,
  onRename,
  onMove,
  onDelete,
}) => {
  const date = file.updated_at || file.created_at

  return (
    <article
      className='group relative min-h-[190px] min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md hover:shadow-orange-900/5'
    >
      {/* Top accent */}
      <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100' />

      {/* Dropdown */}
      <div className='absolute right-3 top-3 z-10'>
        <ItemDropdown
          item={file}
          onPreview={onPreview}
          onShare={onShare}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
        />
      </div>

      <button
        type='button'
        onClick={() => onPreview?.(file)}
        className='block w-full min-w-0 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
        aria-label={`Preview ${file.name}`}
      >
        {/* File icon */}
        <span className='mb-5 flex size-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-orange-100 group-hover:bg-orange-50 group-hover:text-orange-600'>
          {getFileIcon(file.mime_type, 'size-7')}
        </span>

        {/* File name */}
        <span
          className='block truncate pr-8 text-[15px] font-semibold text-slate-800 transition-colors group-hover:text-orange-700'
          title={file.name}
        >
          {file.name}
        </span>

        {/* File information */}
        <span className='mt-3 flex items-center justify-between gap-3 text-xs'>
          <span className='rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 transition-colors group-hover:bg-orange-50 group-hover:text-orange-600'>
            {formatBytes(file.size)}
          </span>

          <span className='truncate text-slate-400'>
            {date ? format(new Date(date), 'MMM d, yyyy') : '—'}
          </span>
        </span>
      </button>
    </article>
  )
}

export default FileCard
