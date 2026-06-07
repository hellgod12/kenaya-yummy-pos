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
  Cake,
  Wallet
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface DashboardStats {
  todayRevenue: number
  todayProfit: number
  todayExpenses: number
  todayNetProfit: number
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
    todayExpenses: 0,
    todayNetProfit: 0,
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
      // Use UTC date to match Supabase's timezone
      const now = new Date()
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
      
      const todayStart = todayUTC.toISOString()
      const todayEnd = tomorrowUTC.toISOString()

      console.log('DASHBOARD DATE RANGE:', { todayStart, todayEnd })

      // Get today's sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, profit')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)

      const todayRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0
      const todayProfit = salesData?.reduce((sum, sale) => sum + Number(sale.profit), 0) || 0

      console.log('TODAY SALES DATA:', salesData)
      console.log('TODAY REVENUE:', todayRevenue)
      console.log('TODAY PROFIT:', todayProfit)

      // Get today's total quantity sold (sum of all sale_items quantities)
      const { data: saleItemsData } = await supabase
        .from('sale_items')
        .select('quantity')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)

      const todayQuantitySold = saleItemsData?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0

      console.log('TODAY SALE ITEMS DATA:', saleItemsData)
      console.log('TODAY QUANTITY SOLD:', todayQuantitySold)

      // Get low stock products (stock < 10)
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 10)

      // Get best sellers (top 5 by quantity sold TODAY)
      const { data: bestSellersRawData } = await supabase
        .from('sale_items')
        .select('product_id, quantity, products!inner(name)')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)

      // Aggregate by product_id and sum quantities
      const productAggregates = new Map<string, { quantity: number, name: string }>()
      bestSellersRawData?.forEach(item => {
        const productId = item.product_id
        const current = productAggregates.get(productId) || { quantity: 0, name: (item as any).products?.name || 'Unknown' }
        productAggregates.set(productId, {
          quantity: current.quantity + Number(item.quantity),
          name: current.name
        })
      })

      // Convert to array, sort by quantity descending, and take top 5
      const bestSellersData = Array.from(productAggregates.entries())
        .map(([product_id, data]) => ({
          product_id,
          quantity: data.quantity,
          products: { name: data.name }
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      console.log('TODAY BEST SELLERS:', bestSellersData)

      // Get today's expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', todayUTC.toISOString().split('T')[0])
        .lte('expense_date', tomorrowUTC.toISOString().split('T')[0])

      const todayExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0
      const todayNetProfit = todayProfit - todayExpenses

      console.log('TODAY EXPENSES:', todayExpenses)
      console.log('TODAY NET PROFIT:', todayNetProfit)

      setStats({
        todayRevenue,
        todayProfit,
        todayExpenses,
        todayNetProfit,
        todaySales: todayQuantitySold, // Changed from sales count to total quantity
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
      title: 'Laba Kotor Hari Ini',
      value: `Rp ${stats.todayProfit.toLocaleString('id-ID')}`,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Pengeluaran Hari Ini',
      value: `Rp ${stats.todayExpenses.toLocaleString('id-ID')}`,
      icon: Wallet,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Laba Bersih Hari Ini',
      value: `Rp ${stats.todayNetProfit.toLocaleString('id-ID')}`,
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Produk Terjual',
      value: stats.todaySales.toString(),
      icon: ShoppingCart,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
