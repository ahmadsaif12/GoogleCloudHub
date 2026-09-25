import { useLocation, Link } from 'react-router-dom'
import {
  HardDriveIcon,
  Trash2Icon,
  UsersIcon,
  PlusIcon,
  FolderPlusIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Dropdown, DropdownItem } from '../ui/Dropdown'
import { ProgressBar } from '../ui/ProgressBar'
import { formatBytes } from '../../assets/assets'

const navItems = [
  { label: 'My Drive', path: '/', icon: HardDriveIcon },
  { label: 'Shared Files', path: '/shared', icon: UsersIcon },
  { label: 'Trash', path: '/trash', icon: Trash2Icon },
]

const Sidebar = ({ onCreateFolderClick, onUploadClick, isMobileOpen, setIsMobileOpen }) => {
  const { user, isUploading, uploadProgress } = useApp()
  const location = useLocation()
  const storageUsed = Number(user?.storage_used ?? user?.storageUsed ?? 0)
  const storageLimit = Number(user?.storage_limit ?? user?.storageLimit ?? 1073741824)
  const percentage = storageLimit ? Math.min(100, Math.round((storageUsed / storageLimit) * 100)) : 0

  const isActive = (path) => path === '/'
    ? location.pathname === '/' || location.pathname.startsWith('/drive/')
    : location.pathname === path

  const closeMobile = () => setIsMobileOpen(false)

  return (
    <>
      {isMobileOpen && (
        <button
          type='button'
          aria-label='Close navigation'
          className='fixed inset-0 z-40 bg-slate-900/30 md:hidden'
          onClick={closeMobile}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-40 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className='flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-3'>
          <Link to='/' onClick={closeMobile} className='flex items-center gap-2.5' aria-label='Drivea home'>
            <span className='flex size-8 items-center justify-center text-orange-600' aria-hidden='true'>
              <svg viewBox='0 0 32 32' className='size-8' fill='currentColor'>
                <path d='M12.2 3 1.5 24.5h11L23.2 3H12.2Z' />
                <path d='m17.5 16.5 7.1 14h7.9L25 16.5h-7.5Z' />
              </svg>
            </span>
            <span>
              <span className='block text-lg font-semibold leading-5 tracking-wide text-slate-800'>DRIVEA</span>
              <span className='mt-0.5 block text-[9px] tracking-[0.16em] text-slate-500'>CLOUD STORAGE</span>
            </span>
          </Link>
          <button type='button' aria-label='Close menu' onClick={closeMobile} className='rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden'>
            <XIcon size={18} />
          </button>
        </div>

        <div className='px-2.5 pt-3'>
          <Dropdown
            align='left'
            className='w-52'
            trigger={
              <button type='button' className='flex h-8 w-fit items-center gap-1.5 rounded-md bg-orange-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-orange-700'>
                <PlusIcon size={16} />
                New Item
              </button>
            }
          >
            <DropdownItem icon={FolderPlusIcon} onClick={onCreateFolderClick}>New Folder</DropdownItem>
            <DropdownItem icon={UploadIcon} onClick={onUploadClick}>Upload File</DropdownItem>
          </Dropdown>
        </div>

        <nav className='mt-3 px-2 pt-0.5' aria-label='Main navigation'>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                aria-current={active ? 'page' : undefined}
                className={`mb-1 flex h-7 items-center gap-2 rounded-r-md border-r-2 px-3 text-sm transition-colors ${active ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Icon size={16} strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className='mt-auto border-t border-slate-200 bg-slate-50/80 px-3 py-3'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-xs font-medium text-slate-600'>Storage</span>
            <span className='text-[11px] font-medium text-slate-500'>{percentage}%</span>
          </div>
          <ProgressBar progress={isUploading ? uploadProgress : percentage} className='bg-slate-200' color='bg-orange-600' />
          <p className='mt-1.5 text-[10px] text-slate-500'>
            {isUploading ? `Uploading... ${uploadProgress}%` : `${formatBytes(storageUsed)} of ${formatBytes(storageLimit)} used`}
          </p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
