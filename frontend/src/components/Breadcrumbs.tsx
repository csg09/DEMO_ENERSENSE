import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      <Link
        to="/"
        className="flex items-center gap-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
      >
        <Home size={16} />
        <span>Home</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight size={16} className="text-gray-400" />
            {isLast || !item.path ? (
              <span className={isLast ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
