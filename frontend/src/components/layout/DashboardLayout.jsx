import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MenuIcon } from 'lucide-react'
import Sidebar from './Sidebar'

const DashboardLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className='flex min-h-screen flex-col md:pl-64'>
        <header className='flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6'>
          <button
            type='button'
            aria-label='Open navigation menu'
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen(true)}
            className='inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden'
          >
            <MenuIcon size={20} />
          </button>
          <p className='font-medium'>Header</p>
        </header>

        <main className='flex-1 overflow-y-auto p-4 md:p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
