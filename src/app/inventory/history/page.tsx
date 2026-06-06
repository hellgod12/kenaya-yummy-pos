'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { History, ArrowDown, ArrowUp, AlertCircle, Package } from 'lucide-react'

interface StockMovement {
  id: string
  product_id: string
  type: 'in' | 'out' | 'production' | 'waste'
  quantity: number
  notes: string | null
  created_at: string
  products: {
    name: string
    category: string
  }
}

const movementConfig = {
  in: { icon: ArrowDown, label: 'Masuk', color: 'bg-green-500', textColor: 'text-green-600' },
  out: { icon: ArrowUp, label: 'Keluar', color: 'bg-blue-500', textColor: 'text-blue-600' },
  production: { icon: Package, label: 'Produksi', color: 'bg-purple-500', textColor: 'text-purple-600' },
  waste: { icon: AlertCircle, label: 'Rusak', color: 'bg-red-500', textColor: 'text-red-600' }
}

export default function StockHistoryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [movements, setMovements] = useState<StockMovement[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchMovements()
    }
  }, [user])

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, products(*)')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setMovements(data || [])
    } catch (error) {
      console.error('Error fetching stock movements:', error)
    }
  }

  if (loading || !user) {
    return null
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Riwayat Stok</h1>
            <p className="text-gray-600 mt-1">Lihat semua pergerakan stok barang</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-orange-500" />
                Pergerakan Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Belum ada data pergerakan stok
                  </div>
                ) : (
                  movements.map((movement) => {
                    const config = movementConfig[movement.type]
                    const Icon = config.icon
                    return (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${config.color}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              {movement.products?.name}
                            </h4>
                            <p className="text-sm text-gray-500 capitalize">
                              {movement.products?.category}
                            </p>
                            {movement.notes && (
                              <p className="text-xs text-gray-400 mt-1">{movement.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={config.textColor}>
                            {config.label}
                          </Badge>
                          <div className="mt-1 font-semibold text-gray-800">
                            {movement.quantity}
                          </div>
                          <div className="text-xs text-gray-400">
                            {format(new Date(movement.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
