'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle,
  Cake
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface DashboardStats {
  todayRevenue: number
  todayProfit: number
  todaySales: number
  lowStock: number
  bestSellers: any[]
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayProfit: 0,
    todaySales: 0,
    lowStock: 0,
    bestSellers: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      // Get today's sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, profit')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      const todayRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0
      const todayProfit = salesData?.reduce((sum, sale) => sum + Number(sale.profit), 0) || 0

      // Get today's sales count
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      // Get low stock products (stock < 10)
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 10)

      // Get best sellers (top 5 by quantity sold)
      const { data: bestSellersData } = await supabase
        .from('sale_items')
        .select('product_id, quantity, products!inner(name)')
        .order('quantity', { ascending: false })
        .limit(5)

      setStats({
        todayRevenue,
        todayProfit,
        todaySales: salesCount || 0,
        lowStock: lowStockCount || 0,
        bestSellers: bestSellersData || []
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Omzet Hari Ini',
      value: `Rp ${stats.todayRevenue.toLocaleString('id-ID')}`,
      icon: DollarSign,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Laba Hari Ini',
      value: `Rp ${stats.todayProfit.toLocaleString('id-ID')}`,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Produk Terjual',
      value: stats.todaySales.toString(),
      icon: ShoppingCart,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Stok Menipis',
      value: stats.lowStock.toString(),
      icon: AlertTriangle,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-50'
    }
  ]

  if (loading || !user) {
    return null
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'kasir']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Selamat datang kembali, {user!.name}!
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat) => (
                <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Best Sellers */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-orange-500" />
                  Produk Terlaris
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.bestSellers.length > 0 ? (
                  <div className="space-y-4">
                    {stats.bestSellers.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-white rounded-lg border border-orange-100"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {(item as any).products?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.quantity} terjual
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Belum ada data penjualan
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
