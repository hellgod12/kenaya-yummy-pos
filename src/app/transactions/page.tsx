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
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { id } from 'date-fns/locale'
import { Receipt, Search, Calendar, Filter, Printer, Download, Trash2, Edit2, Eye } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface Sale {
  id: string
  created_at: string
  total_amount: number
  total_cost: number
  profit: number
  payment_method: 'cash' | 'transfer'
  created_by: string
  payment_reference?: string
}

interface SaleItem {
  id: string
  product_id: string
  quantity: number
  price: number
  cost: number
  subtotal: number
  products: {
    name: string
  }
}

export default function TransactionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [editingSaleItems, setEditingSaleItems] = useState<SaleItem[]>([])
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'transfer'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchSales()
    }
  }, [user, dateFilter, paymentMethodFilter])

  const fetchSales = async () => {
    try {
      setIsLoading(true)
      let startDate, endDate

      if (dateFilter === 'today') {
        const now = new Date()
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
      } else if (dateFilter === 'week') {
        const now = new Date()
        startDate = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T00:00:00'")
        endDate = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T23:59:59'")
      } else if (dateFilter === 'month') {
        const now = new Date()
        startDate = format(startOfMonth(now), "yyyy-MM-dd'T00:00:00'")
        endDate = format(endOfMonth(now), "yyyy-MM-dd'T23:59:59'")
      } else if (dateFilter === 'year') {
        const now = new Date()
        startDate = format(startOfYear(now), "yyyy-MM-dd'T00:00:00'")
        endDate = format(endOfYear(now), "yyyy-MM-dd'T23:59:59'")
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        startDate = `${customStartDate}T00:00:00`
        endDate = `${customEndDate}T23:59:59`
      }

      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateFilter !== 'all' && startDate && endDate) {
        query = query.gte('created_at', startDate).lte('created_at', endDate)
      }

      if (paymentMethodFilter !== 'all') {
        query = query.eq('payment_method', paymentMethodFilter)
      }

      const { data, error } = await query

      console.log('SALES DATA:', data)
      console.log('SALES ERROR:', error)

      if (error) throw error
      setSales(data || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSaleItems = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, products(name)')
        .eq('sale_id', saleId)

      if (error) throw error
      setSaleItems(data || [])
    } catch (error) {
      console.error('Error fetching sale items:', error)
    }
  }

  const handleViewDetail = (sale: Sale) => {
    setSelectedSale(sale)
    fetchSaleItems(sale.id)
    setIsDetailOpen(true)
  }

  const handleVoidTransaction = async () => {
    if (!selectedSale || !voidReason) return

    try {
      // Restore stock for each item
      for (const item of saleItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single()

        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock + item.quantity })
            .eq('id', item.product_id)
        }
      }

      // Log the void action
      await supabase.from('transaction_logs').insert({
        transaction_id: selectedSale.id,
        action: 'void',
        reason: voidReason,
        old_data: selectedSale,
        user_id: user!.id
      })

      // Delete the sale (cascade will delete sale_items)
      await supabase.from('sales').delete().eq('id', selectedSale.id)

      // Refresh sales list
      fetchSales()
      setIsDetailOpen(false)
      setIsVoidDialogOpen(false)
      setVoidReason('')
      setSelectedSale(null)
    } catch (error) {
      console.error('Error voiding transaction:', error)
    }
  }

  const handleEditTransaction = () => {
    if (!selectedSale) return
    setEditingSaleItems([...saleItems])
    setEditingPaymentMethod(selectedSale.payment_method)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedSale) return

    try {
      // Calculate new totals
      const newTotalAmount = editingSaleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const newTotalCost = editingSaleItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0)
      const newProfit = newTotalAmount - newTotalCost

      // Log the edit action with old data
      await supabase.from('transaction_logs').insert({
        transaction_id: selectedSale.id,
        action: 'edit',
        reason: 'Edit transaksi',
        old_data: {
          sale: selectedSale,
          sale_items: saleItems
        },
        new_data: {
          sale: {
            ...selectedSale,
            total_amount: newTotalAmount,
            total_cost: newTotalCost,
            profit: newProfit,
            payment_method: editingPaymentMethod
          },
          sale_items: editingSaleItems
        },
        user_id: user!.id
      })

      // Update stock for changed quantities
      for (const oldItem of saleItems) {
        const newItem = editingSaleItems.find(i => i.id === oldItem.id)
        if (newItem && newItem.quantity !== oldItem.quantity) {
          const diff = oldItem.quantity - newItem.quantity
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', oldItem.product_id)
            .single()

          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + diff })
              .eq('id', oldItem.product_id)
          }
        }
      }

      // Update sale
      await supabase
        .from('sales')
        .update({
          total_amount: newTotalAmount,
          total_cost: newTotalCost,
          profit: newProfit,
          payment_method: editingPaymentMethod
        })
        .eq('id', selectedSale.id)

      // Update sale items
      for (const item of editingSaleItems) {
        await supabase
          .from('sale_items')
          .update({
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
          })
          .eq('id', item.id)
      }

      // Refresh data
      fetchSales()
      fetchSaleItems(selectedSale.id)
      setIsEditDialogOpen(false)
      setIsDetailOpen(false)
      setSelectedSale(null)
    } catch (error) {
      console.error('Error editing transaction:', error)
    }
  }

  const printReceipt = () => {
    if (!selectedSale) return

    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('Kenaya Yummy', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text('Nota Transaksi', 105, 30, { align: 'center' })
    
    // Transaction info
    doc.setFontSize(10)
    doc.text(`Invoice: INV-${selectedSale.id.slice(0, 8).toUpperCase()}`, 20, 50)
    doc.text(`Tanggal: ${format(new Date(selectedSale.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}`, 20, 58)
    doc.text(`Kasir ID: ${selectedSale.created_by}`, 20, 66)
    doc.text(`Metode: ${selectedSale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}`, 20, 74)
    
    // Products table
    const tableData = saleItems.map((item) => [
      item.products?.name || 'Unknown',
      item.quantity.toString(),
      `Rp ${item.price.toLocaleString('id-ID')}`,
      `Rp ${item.subtotal.toLocaleString('id-ID')}`
    ])

    autoTable(doc, {
      startY: 85,
      head: [['Produk', 'Qty', 'Harga', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] }
    })

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(11)
    doc.text(`Total: Rp ${selectedSale.total_amount.toLocaleString('id-ID')}`, 20, finalY)
    doc.text(`Modal: Rp ${selectedSale.total_cost.toLocaleString('id-ID')}`, 20, finalY + 8)
    doc.text(`Profit: Rp ${selectedSale.profit.toLocaleString('id-ID')}`, 20, finalY + 16)

    doc.save(`nota-${selectedSale.id}.pdf`)
  }

  const downloadExcel = () => {
    if (!selectedSale) return

    const workbook = XLSX.utils.book_new()

    // Transaction info
    const transactionData = [
      ['Informasi Transaksi'],
      ['Invoice', `INV-${selectedSale.id.slice(0, 8).toUpperCase()}`],
      ['Tanggal', format(new Date(selectedSale.created_at), 'dd MMM yyyy, HH:mm', { locale: id })],
      ['Kasir ID', selectedSale.created_by],
      ['Metode Pembayaran', selectedSale.payment_method === 'cash' ? 'Tunai' : 'Transfer'],
      [''],
      ['Ringkasan'],
      ['Total', selectedSale.total_amount],
      ['Modal', selectedSale.total_cost],
      ['Profit', selectedSale.profit]
    ]
    const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData)
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transaksi')

    // Products
    const productsData = saleItems.map((item) => ({
      'Produk': item.products?.name || 'Unknown',
      'Quantity': item.quantity,
      'Harga': item.price,
      'Modal': item.cost,
      'Subtotal': item.subtotal
    }))
    const productsSheet = XLSX.utils.json_to_sheet(productsData)
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Produk')

    XLSX.writeFile(workbook, `nota-${selectedSale.id}.xlsx`)
  }

  // Filter sales by search query
  const filteredSales = sales.filter(sale => {
    const invoice = `INV-${sale.id.slice(0, 8).toUpperCase()}`
    const cashier = sale.created_by || ''
    const query = searchQuery.toLowerCase()
    return invoice.toLowerCase().includes(query) || cashier.toLowerCase().includes(query)
  })

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
              <h1 className="text-3xl font-bold text-gray-800">Riwayat Transaksi</h1>
              <p className="text-gray-600 mt-1">Lihat dan kelola seluruh transaksi</p>
            </div>

            {/* Filters */}
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-orange-500" />
                  Filter Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Cari</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Invoice atau kasir..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tanggal</label>
                    <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="today">Hari Ini</SelectItem>
                        <SelectItem value="week">Minggu Ini</SelectItem>
                        <SelectItem value="month">Bulan Ini</SelectItem>
                        <SelectItem value="year">Tahun Ini</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dateFilter === 'custom' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Dari</label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Sampai</label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Metode Pembayaran</label>
                    <Select value={paymentMethodFilter} onValueChange={(value: any) => setPaymentMethodFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-orange-500" />
                  Daftar Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Memuat data...</div>
                ) : paginatedSales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Tidak ada transaksi ditemukan</div>
                ) : (
                  <div className="space-y-4">
                    {paginatedSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleViewDetail(sale)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                            <Receipt className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              INV-{sale.id.slice(0, 8).toUpperCase()}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {format(new Date(sale.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                            </p>
                            <p className="text-xs text-gray-400">
                              Kasir ID: {sale.created_by}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={sale.payment_method === 'cash' ? 'bg-blue-500' : 'bg-purple-500'}>
                            {sale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                          </Badge>
                          <div className="mt-1 font-semibold text-orange-600">
                            Rp {sale.total_amount.toLocaleString('id-ID')}
                          </div>
                          <div className="text-xs text-gray-400">
                            Profit: Rp {sale.profit.toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                      Halaman {currentPage} dari {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Transaction Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              Detail Transaksi
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Invoice</p>
                  <p className="font-semibold">INV-{selectedSale.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tanggal</p>
                  <p className="font-semibold">
                    {format(new Date(selectedSale.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kasir ID</p>
                  <p className="font-semibold">{selectedSale.created_by}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Metode Pembayaran</p>
                  <Badge className={selectedSale.payment_method === 'cash' ? 'bg-blue-500' : 'bg-purple-500'}>
                    {selectedSale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                  </Badge>
                </div>
              </div>

              {/* Products Table */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Daftar Produk</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Produk</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Harga</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Modal</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-3 text-sm">{item.products?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            Rp {item.price.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            Rp {item.cost.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Total Omzet</p>
                  <p className="text-lg font-bold text-orange-600">
                    Rp {selectedSale.total_amount.toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Modal</p>
                  <p className="text-lg font-bold text-gray-600">
                    Rp {selectedSale.total_cost.toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-lg font-bold text-green-600">
                    Rp {selectedSale.profit.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={printReceipt} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                  <Printer className="w-4 h-4 mr-2" />
                  Cetak Nota
                </Button>
                <Button onClick={downloadExcel} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500">
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel
                </Button>
                {user?.role === 'admin' && (
                  <>
                    <Button
                      onClick={handleEditTransaction}
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Transaksi
                    </Button>
                    <Button
                      onClick={() => setIsVoidDialogOpen(true)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Void Transaksi
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Void Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Apakah Anda yakin ingin menghapus transaksi ini? Stok akan dikembalikan secara otomatis.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Alasan</label>
              <Select value={voidReason} onValueChange={(value: string | null) => setVoidReason(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih alasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salah_input">Transaksi salah input</SelectItem>
                  <SelectItem value="duplikat">Duplikat</SelectItem>
                  <SelectItem value="customer_batal">Customer batal</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setIsVoidDialogOpen(false)
                  setVoidReason('')
                }}
                variant="outline"
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleVoidTransaction}
                variant="destructive"
                className="flex-1"
                disabled={!voidReason}
              >
                Ya, Void Transaksi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-orange-500" />
              Edit Transaksi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Payment Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Metode Pembayaran</label>
              <Select value={editingPaymentMethod} onValueChange={(value: 'cash' | 'transfer' | null) => setEditingPaymentMethod(value as 'cash' | 'transfer')}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai (Cash)</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products Table */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Edit Produk</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Produk</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Qty</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Harga</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingSaleItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-3 text-sm">{item.products?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = editingSaleItems.map(i =>
                                i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i
                              )
                              setEditingSaleItems(newItems)
                            }}
                            className="w-20 text-center"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <Input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => {
                              const newItems = editingSaleItems.map(i =>
                                i.id === item.id ? { ...i, price: parseInt(e.target.value) || 0 } : i
                              )
                              setEditingSaleItems(newItems)
                            }}
                            className="w-32 text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Preview */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Omzet</p>
                <p className="text-lg font-bold text-orange-600">
                  Rp {editingSaleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Modal</p>
                <p className="text-lg font-bold text-gray-600">
                  Rp {editingSaleItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-lg font-bold text-green-600">
                  Rp {(editingSaleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) - editingSaleItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0)).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingSaleItems([])
                }}
                variant="outline"
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
