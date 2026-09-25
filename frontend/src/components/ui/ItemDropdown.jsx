import { MoreVerticalIcon, EyeIcon, Share2Icon, Edit2Icon, FolderInputIcon, Trash2Icon } from 'lucide-react'
import { Dropdown, DropdownItem } from './Dropdown'

export function ItemDropdown({ item, onPreview, onShare, onRename, onMove, onDelete }) {
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Dropdown
        align='right'
        className='w-40'
        trigger={
          <button
            type='button'
            aria-label={`Actions for ${item.name}`}
            className='rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 opacity-100 md:opacity-0 md:group-hover:opacity-100'
          >
            <MoreVerticalIcon size={16} />
          </button>
        }
      >
        {onPreview && <DropdownItem icon={EyeIcon} onClick={() => onPreview(item)}>Preview</DropdownItem>}
        <DropdownItem icon={Share2Icon} onClick={() => onShare(item)}>Share Link</DropdownItem>
        <DropdownItem icon={Edit2Icon} onClick={() => onRename(item)}>Rename</DropdownItem>
        <DropdownItem icon={FolderInputIcon} onClick={() => onMove(item)}>Move to...</DropdownItem>
        <DropdownItem icon={Trash2Icon} danger onClick={() => onDelete(item)}>Delete</DropdownItem>
      </Dropdown>
    </div>
  )
}
