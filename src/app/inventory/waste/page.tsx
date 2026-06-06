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
import { AlertTriangle, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
  stock: number
}

interface WasteItem {
  id: string
  product_id: string
  quantity: number
  reason: string
  created_at: string
  products: Product
}

export default function WastePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [wasteRecords, setWasteRecords] = useState<WasteItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProducts()
      fetchWasteRecords()
    }
  }, [user])

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

  const fetchWasteRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('waste_items')
        .select('*, products(*)')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setWasteRecords(data || [])
    } catch (error) {
      console.error('Error fetching waste records:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProduct || !quantity || !reason) {
      alert('Mohon lengkapi semua field')
      return
    }

    try {
      const qty = parseInt(quantity)
      const product = products.find(p => p.id === selectedProduct)
      
      if (qty > product!.stock) {
        alert('Jumlah melebihi stok tersedia')
        return
      }
      
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: product!.stock - qty })
        .eq('id', selectedProduct)
      
      if (updateError) throw updateError

      // Create waste item
      const { error: wasteError } = await supabase
        .from('waste_items')
        .insert({
          product_id: selectedProduct,
          quantity: qty,
          reason: reason,
          created_by: user!.id
        })
      
      if (wasteError) throw wasteError

      // Create stock movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: selectedProduct,
          type: 'waste',
          quantity: qty,
          notes: reason,
          created_by: user!.id
        })
      
      if (movementError) throw movementError

      alert('Barang rusak berhasil dicatat!')
      setSelectedProduct('')
      setQuantity('')
      setReason('')
      fetchProducts()
      fetchWasteRecords()
    } catch (error) {
      console.error('Error recording waste:', error)
      alert('Terjadi kesalahan saat mencatat barang rusak')
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
            <h1 className="text-3xl font-bold text-gray-800">Barang Rusak</h1>
            <p className="text-gray-600 mt-1">Catat barang yang rusak atau tidak layak jual</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Catat Barang Rusak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Produk</label>
                    <Select value={selectedProduct} onValueChange={(value) => setSelectedProduct(value || '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih produk" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (Stok: {product.stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Jumlah</label>
                    <Input
                      type="number"
                      placeholder="Masukkan jumlah"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Alasan</label>
                    <Input
                      placeholder="Contoh: Kadaluarsa, rusak, dll"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-md"
                  >
                    Simpan
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Records */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  Riwayat Barang Rusak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {wasteRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada data barang rusak
                    </div>
                  ) : (
                    wasteRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 bg-gradient-to-r from-red-50 to-white rounded-lg border border-red-100"
                      >
                        <h4 className="font-semibold text-gray-800 mb-1">
                          {record.products?.name}
                        </h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Jumlah: {record.quantity}</span>
                          <span className="text-gray-500">{record.reason}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(record.created_at).toLocaleString('id-ID')}
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
