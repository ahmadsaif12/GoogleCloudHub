import { FolderIcon } from 'lucide-react'
import { ItemDropdown } from '../ui/ItemDropdown'

const FolderCard = ({ folder, onOpen, onShare, onRename, onMove, onDelete }) => (
  <article className='group relative flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-orange-200 hover:bg-orange-50/20'>
    <button
      type='button'
      onClick={() => onOpen?.(folder)}
      className='flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-lg'
      aria-label={`Open ${folder.name}`}
    >
      <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600'>
        <FolderIcon size={17} strokeWidth={1.8} />
      </span>
      <span className='truncate text-sm font-medium text-slate-800 group-hover:text-orange-700' title={folder.name}>
        {folder.name}
      </span>
    </button>
    <div className='shrink-0'>
      <ItemDropdown
        item={folder}
        onShare={onShare}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
      />
    </div>
  </article>
)

export default FolderCard
