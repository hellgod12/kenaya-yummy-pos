'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { MobileNavigation } from '@/components/MobileNavigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  Wheat, 
  BookOpen, 
  Cake, 
  BarChart3, 
  Wallet, 
  LogOut,
  Store,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

const moreNavigation = [
  { name: 'Produk', href: '/inventory/products', icon: Package, roles: ['admin'], color: 'from-blue-500 to-blue-600' },
  { name: 'Bahan Baku', href: '/inventory/raw-materials', icon: Wheat, roles: ['admin'], color: 'from-amber-500 to-amber-600' },
  { name: 'Resep Produk', href: '/inventory/recipes', icon: BookOpen, roles: ['admin'], color: 'from-purple-500 to-purple-600' },
  { name: 'Stok Masuk', href: '/inventory/stock-in', icon: Package, roles: ['admin'], color: 'from-green-500 to-green-600' },
  { name: 'Produksi Harian', href: '/inventory/production', icon: Cake, roles: ['admin'], color: 'from-pink-500 to-pink-600' },
  { name: 'Barang Rusak', href: '/inventory/waste', icon: Package, roles: ['admin'], color: 'from-red-500 to-red-600' },
  { name: 'Riwayat Stok', href: '/inventory/history', icon: BarChart3, roles: ['admin'], color: 'from-indigo-500 to-indigo-600' },
  { name: 'Keuangan', href: '/finance/expenses', icon: Wallet, roles: ['admin'], color: 'from-teal-500 to-teal-600' },
  { name: 'Laporan', href: '/reports', icon: BarChart3, roles: ['admin'], color: 'from-orange-500 to-orange-600' },
]

export default function MorePage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'kasir']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="p-4 md:p-8">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Lainnya</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Akses semua fitur aplikasi</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {moreNavigation
                .filter((item) => item.roles.includes(user?.role || 'kasir'))
                .map((item) => (
                  <Link key={item.name} href={item.href}>
                    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 overflow-hidden">
                      <CardContent className="p-6">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-md`}>
                          <item.icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-800 text-lg mb-1">{item.name}</h3>
                        <div className="flex items-center text-orange-600">
                          <span className="text-sm font-medium">Buka</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

              {/* Logout Card */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 overflow-hidden"
                onClick={handleLogout}
              >
                <CardContent className="p-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center mb-4 shadow-md">
                    <LogOut className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-lg mb-1">Keluar</h3>
                  <div className="flex items-center text-red-600">
                    <span className="text-sm font-medium">Logout</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Info Card */}
            <Card className="mt-6 md:mt-8 bg-gradient-to-r from-orange-50 to-white border-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <Store className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Login sebagai</p>
                    <p className="text-lg font-bold text-gray-800">{user?.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <MobileNavigation />
      </div>
    </ProtectedRoute>
  )
}
