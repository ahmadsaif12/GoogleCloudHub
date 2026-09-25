import { format } from 'date-fns'
import { getFileIcon, formatBytes } from '../../assets/assets'
import { ItemDropdown } from '../ui/ItemDropdown'

const FileCard = ({ file, onPreview, onShare, onRename, onMove, onDelete }) => {
  const date = file.updated_at || file.created_at

  return (
    <article className='group relative min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-orange-200 hover:bg-orange-50/20'>
      <button
        type='button'
        onClick={() => onPreview?.(file)}
        className='block w-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-lg'
        aria-label={`Preview ${file.name}`}
      >
        <span className='mb-1.5 flex size-8 items-center justify-center rounded-lg bg-slate-50'>
          {getFileIcon(file.mime_type, 'size-4')}
        </span>
        <span className='block truncate pr-5 text-sm font-medium text-slate-800 group-hover:text-orange-700' title={file.name}>
          {file.name}
        </span>
        <span className='mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500'>
          <span>{formatBytes(file.size)}</span>
          <span>{date ? format(new Date(date), 'MMM d, yyyy') : '—'}</span>
        </span>
      </button>
      <div className='absolute right-2 top-2'>
        <ItemDropdown
          item={file}
          onPreview={onPreview}
          onShare={onShare}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
        />
      </div>
    </article>
  )
}

export default FileCard
