import { ChevronRightIcon, HardDriveIcon } from 'lucide-react'

const BreadCrumbs = ({ items = [], onNavigate }) => (
  <nav aria-label='Breadcrumb' className='flex min-w-0 items-center gap-1 overflow-hidden text-sm'>
    {items.map((item, index) => {
      const current = index === items.length - 1
      return (
        <span key={item.id || 'root'} className='flex min-w-0 shrink-0 items-center gap-1'>
          {index > 0 && <ChevronRightIcon size={14} className='shrink-0 text-slate-400' />}
          <button
            type='button'
            onClick={() => onNavigate?.(item)}
            aria-current={current ? 'page' : undefined}
            className={`inline-flex max-w-48 items-center gap-1.5 truncate rounded-md border px-1.5 py-0.5 transition-colors ${current ? 'border-slate-200 bg-white text-slate-700' : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-800'}`}
          >
            {index === 0 && <HardDriveIcon size={13} className='shrink-0 text-orange-600' />}
            <span className='truncate'>{item.name}</span>
          </button>
        </span>
      )
    })}
  </nav>
)

export default BreadCrumbs
