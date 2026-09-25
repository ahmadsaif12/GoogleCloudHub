import { useNavigate, useLocation } from 'react-router-dom'
import { SearchIcon, ArrowDownUpIcon, LogOutIcon, UserRoundIcon, MenuIcon } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { SORT_OPTIONS } from '../../assets/assets'
import { Dropdown, DropdownItem } from '../ui/Dropdown'

const Header = ({ onMobileMenuToggle }) => {
  const { user, logout, searchQuery, setSearchQuery, sortBy, setSortBy } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const isDrivePage = location.pathname === '/' || location.pathname.startsWith('/drive/')

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className='sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6'>
      <button
        type='button'
        aria-label='Open navigation menu'
        onClick={onMobileMenuToggle}
        className='inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden'
      >
        <MenuIcon size={19} />
      </button>

      {isDrivePage ? (
        <label className='flex h-10 w-full max-w-[22rem] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-orange-300 focus-within:bg-white'>
          <SearchIcon size={16} className='shrink-0' />
          <input
            type='search'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder='Search files and folders...'
            aria-label='Search files and folders'
            className='w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400'
          />
        </label>
      ) : <div className='flex-1' />}

      <div className='ml-auto flex items-center gap-2'>
        {isDrivePage && (
          <Dropdown
            align='right'
            className='w-52'
            trigger={
              <button type='button' className='inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50'>
                <ArrowDownUpIcon size={14} />
                <span className='hidden sm:inline'>Sort</span>
              </button>
            }
          >
            {SORT_OPTIONS.map((option) => (
              <DropdownItem key={option.value} onClick={() => setSortBy(option.value)}>
                <span className='flex w-full items-center justify-between gap-3'>
                  {option.label}
                  {sortBy === option.value && <span className='size-1.5 rounded-full bg-orange-500' />}
                </span>
              </DropdownItem>
            ))}
          </Dropdown>
        )}

        <Dropdown
          align='right'
          className='w-48'
          trigger={
            <button
              type='button'
              aria-label='Account menu'
              className='flex size-9 items-center justify-center rounded-full bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700'
            >
              {user?.name?.trim()?.[0]?.toUpperCase() || <UserRoundIcon size={17} />}
            </button>
          }
        >
          <div className='border-b border-slate-100 px-3 py-2.5'>
            <p className='truncate text-sm font-semibold text-slate-800'>{user?.name || 'Drive user'}</p>
            <p className='truncate text-xs text-slate-500'>{user?.email}</p>
          </div>
          <DropdownItem icon={LogOutIcon} onClick={handleLogout}>Sign out</DropdownItem>
        </Dropdown>
      </div>
    </header>
  )
}

export default Header
