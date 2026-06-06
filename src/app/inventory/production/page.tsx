'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Cake, Plus } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
}

interface DailyProduction {
  id: string
  product_id: string
  date: string
  quantity_produced: number
  quantity_sold: number
  quantity_waste: number
  quantity_remaining: number
  products: Product
}

export default function ProductionPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [productionRecords, setProductionRecords] = useState<DailyProduction[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantityProduced, setQuantityProduced] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProducts()
      fetchProductionRecords()
    }
  }, [user, selectedDate])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchProductionRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_production')
        .select('*, products(*)')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setProductionRecords(data || [])
    } catch (error) {
      console.error('Error fetching production records:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProduct || !quantityProduced) {
      alert('Mohon lengkapi semua field')
      return
    }

    try {
      const qty = parseInt(quantityProduced)
      
      // Check if record exists for this product and date
      const { data: existing } = await supabase
        .from('daily_production')
        .select('*')
        .eq('product_id', selectedProduct)
        .eq('date', selectedDate)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('daily_production')
          .update({
            quantity_produced: existing.quantity_produced + qty,
            quantity_remaining: existing.quantity_remaining + qty
          })
          .eq('id', existing.id)
        
        if (error) throw error
      } else {
        // Create new record
        const { error } = await supabase
          .from('daily_production')
          .insert({
            product_id: selectedProduct,
            date: selectedDate,
            quantity_produced: qty,
            quantity_remaining: qty,
            quantity_sold: 0,
            quantity_waste: 0,
            created_by: user!.id
          })
        
        if (error) throw error
      }

      alert('Produksi berhasil dicatat!')
      setSelectedProduct('')
      setQuantityProduced('')
      fetchProductionRecords()
    } catch (error) {
      console.error('Error recording production:', error)
      alert('Terjadi kesalahan saat mencatat produksi')
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
            <h1 className="text-3xl font-bold text-gray-800">Produksi Harian</h1>
            <p className="text-gray-600 mt-1">Catat produksi harian produk</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-orange-500" />
                  Catat Produksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tanggal</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Produk</label>
                    <Select value={selectedProduct} onValueChange={(value) => setSelectedProduct(value || '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih produk" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Jumlah Produksi</label>
                    <Input
                      type="number"
                      placeholder="Masukkan jumlah"
                      value={quantityProduced}
                      onChange={(e) => setQuantityProduced(e.target.value)}
                      min="1"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-md"
                  >
                    Simpan Produksi
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Records */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-orange-500" />
                  Riwayat Produksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {productionRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada data produksi untuk tanggal ini
                    </div>
                  ) : (
                    productionRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 bg-gradient-to-r from-orange-50 to-white rounded-lg border border-orange-100"
                      >
                        <h4 className="font-semibold text-gray-800 mb-2">
                          {record.products?.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Produksi:</span>
                            <span className="ml-2 font-semibold">{record.quantity_produced}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Terjual:</span>
                            <span className="ml-2 font-semibold">{record.quantity_sold}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rusak:</span>
                            <span className="ml-2 font-semibold">{record.quantity_waste}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Sisa:</span>
                            <span className="ml-2 font-semibold">{record.quantity_remaining}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
