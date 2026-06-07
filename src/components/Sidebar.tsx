'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  LogOut,
  Cake,
  Store,
  Wallet,
  Wheat,
  BookOpen,
  Receipt
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'kasir'] },
  { name: 'Kasir (POS)', href: '/pos', icon: ShoppingCart, roles: ['admin', 'kasir'] },
  { name: 'Riwayat Transaksi', href: '/transactions', icon: Receipt, roles: ['admin', 'kasir'] },
  { name: 'Produk', href: '/inventory/products', icon: Package, roles: ['admin'] },
  { name: 'Bahan Baku', href: '/inventory/raw-materials', icon: Wheat, roles: ['admin'] },
  { name: 'Resep Produk', href: '/inventory/recipes', icon: BookOpen, roles: ['admin'] },
  { name: 'Stok Masuk', href: '/inventory/stock-in', icon: Package, roles: ['admin'] },
  { name: 'Produksi Harian', href: '/inventory/production', icon: Cake, roles: ['admin'] },
  { name: 'Barang Rusak', href: '/inventory/waste', icon: Package, roles: ['admin'] },
  { name: 'Riwayat Stok', href: '/inventory/history', icon: BarChart3, roles: ['admin'] },
  { name: 'Keuangan', href: '/finance/expenses', icon: Wallet, roles: ['admin'] },
  { name: 'Laporan', href: '/reports', icon: BarChart3, roles: ['admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-orange-50 to-white border-r border-orange-100">
      <div className="flex h-16 items-center justify-center border-b border-orange-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800">Kenaya Yummy</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation
          .filter((item) => item.roles.includes(user?.role || 'kasir'))
          .map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                    : 'text-gray-700 hover:bg-orange-100 hover:text-orange-700'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
      </nav>

      <div className="border-t border-orange-100 p-4">
        <div className="mb-4 px-3">
          <p className="text-xs font-medium text-gray-500">Login sebagai</p>
          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </div>
  )
}
