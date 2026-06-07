'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Receipt,
  Grid3x3
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'kasir'] },
  { name: 'Kasir', href: '/pos', icon: ShoppingCart, roles: ['admin', 'kasir'] },
  { name: 'Transaksi', href: '/transactions', icon: Receipt, roles: ['admin', 'kasir'] },
  { name: 'Lainnya', href: '/more', icon: Grid3x3, roles: ['admin', 'kasir'] },
]

export function MobileNavigation() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavigation
          .filter((item) => item.roles.includes(user?.role || 'kasir'))
          .map((item) => {
            const isActive = pathname === item.href || (item.href === '/more' && pathname.startsWith('/more'))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]',
                  isActive
                    ? 'text-orange-600'
                    : 'text-gray-500'
                )}
              >
                <item.icon className={cn('w-6 h-6', isActive ? 'scale-110' : '')} />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
      </div>
    </div>
  )
}
