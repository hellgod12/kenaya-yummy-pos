'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'
import { Plus, Minus, Trash2, ShoppingBag, Cake, Coffee, Cookie } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface Product {
  id: string
  name: string
  category: 'bakery' | 'cemilan' | 'minuman'
  price: number
  cost: number
  hpp: number
  stock: number
  image_url: string | null
  is_active: boolean
}

const categoryIcons = {
  bakery: Cake,
  cemilan: Cookie,
  minuman: Coffee
}

const categoryColors = {
  bakery: 'from-orange-500 to-red-500',
  cemilan: 'from-yellow-500 to-orange-500',
  minuman: 'from-blue-500 to-indigo-500'
}

export default function POSPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount } = useStore()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Stok habis!')
      return
    }
    
    const existingItem = cart.find(item => item.id === product.id)
    const currentQuantity = existingItem?.quantity || 0
    
    if (currentQuantity >= product.stock) {
      alert('Stok tidak mencukupi!')
      return
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      cost: product.cost,
      hpp: product.hpp || product.cost,
      quantity: 1
    })
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Keranjang kosong!')
      return
    }

    setIsProcessing(true)
    try {
      const totalAmount = getCartTotal()
      const totalCost = cart.reduce((sum, item) => sum + ((item.hpp || item.cost) * item.quantity), 0)
      const profit = totalAmount - totalCost

      console.log('CHECKOUT CALCULATIONS:')
      console.log('totalAmount:', totalAmount)
      console.log('totalCost:', totalCost)
      console.log('profit:', profit)

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_amount: totalAmount,
          total_cost: totalCost,
          profit: profit,
          payment_method: paymentMethod,
          created_by: user!.id
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items and update stock
      for (const item of cart) {
        // Create sale item using HPP instead of manual cost
        await supabase.from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          cost: item.hpp || item.cost, // Use HPP if available, fallback to cost
          subtotal: item.price * item.quantity
        })

        // Update product stock
        await supabase
          .from('products')
          .update({ stock: products.find(p => p.id === item.id)!.stock - item.quantity })
          .eq('id', item.id)

        // Create stock movement
        await supabase.from('stock_movements').insert({
          product_id: item.id,
          type: 'out',
          quantity: item.quantity,
          reference_id: sale.id,
          created_by: user!.id
        })
      }

      clearCart()
      alert('Transaksi berhasil!')
      fetchProducts()
    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Terjadi kesalahan saat memproses transaksi')
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading || !user) {
    return null
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'kasir']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex h-full">
            {/* Left Panel - Categories */}
            <div className="w-64 bg-white border-r border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Kategori</h2>
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('all')}
                >
                  Semua
                </Button>
                {['bakery', 'cemilan', 'minuman'].map((category) => {
                  const Icon = categoryIcons[category as keyof typeof categoryIcons]
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      className="w-full justify-start capitalize"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {category}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Middle Panel - Products */}
            <div className="flex-1 p-6">
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const Icon = categoryIcons[product.category]
                  return (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                      onClick={() => handleAddToCart(product)}
                    >
                      <div className={`h-32 bg-gradient-to-br ${categoryColors[product.category]} flex items-center justify-center`}>
                        <Icon className="w-16 h-16 text-white opacity-80" />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-1 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500 capitalize mb-2">{product.category}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-orange-600">
                            Rp {product.price.toLocaleString('id-ID')}
                          </span>
                          <Badge variant={product.stock < 10 ? 'destructive' : 'secondary'}>
                            Stok: {product.stock}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Right Panel - Cart */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-orange-500" />
                  Keranjang
                </h2>
              </div>
              
              <ScrollArea className="flex-1 p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Keranjang kosong
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">{item.name}</h4>
                            <p className="text-sm text-gray-500">
                              Rp {item.price.toLocaleString('id-ID')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <span className="font-bold text-orange-600">
                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-gray-200 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Jumlah Item</span>
                    <span className="font-semibold">{getCartCount()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-orange-600">
                      Rp {getCartTotal().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Metode Pembayaran
                  </label>
                  <Select value={paymentMethod} onValueChange={(value: 'cash' | 'transfer' | null) => setPaymentMethod(value as 'cash' | 'transfer')}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih metode pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai (Cash)</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-md"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isProcessing}
                >
                  {isProcessing ? 'Memproses...' : 'Bayar'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
