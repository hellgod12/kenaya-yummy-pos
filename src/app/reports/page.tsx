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
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'
import { BarChart3, Download, FileText, Table } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface ReportData {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  totalSales: number
  sales: any[]
  topProducts: any[]
}

export default function ReportsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily')
  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalSales: 0,
    sales: [],
    topProducts: []
  })
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [user, reportType, selectedDate])

  const fetchReportData = async () => {
    try {
      let startDate, endDate
      
      if (reportType === 'daily') {
        startDate = `${selectedDate}T00:00:00`
        endDate = `${selectedDate}T23:59:59`
      } else {
        const date = new Date(selectedDate)
        startDate = format(startOfMonth(date), "yyyy-MM-dd'T00:00:00'")
        endDate = format(endOfMonth(date), "yyyy-MM-dd'T23:59:59'")
      }

      // Get sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0
      const totalCost = salesData?.reduce((sum, sale) => sum + Number(sale.total_cost), 0) || 0
      const totalProfit = salesData?.reduce((sum, sale) => sum + Number(sale.profit), 0) || 0

      // Get top products
      const { data: topProductsData } = await supabase
        .from('sale_items')
        .select('product_id, quantity, products!inner(name)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('quantity', { ascending: false })
        .limit(10)

      setReportData({
        totalRevenue,
        totalCost,
        totalProfit,
        totalSales: salesData?.length || 0,
        sales: salesData || [],
        topProducts: topProductsData || []
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text('Kenaya Yummy - Laporan', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Jenis: ${reportType === 'daily' ? 'Harian' : 'Bulanan'}`, 14, 30)
    doc.text(`Tanggal: ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}`, 14, 38)

    // Summary
    doc.setFontSize(14)
    doc.text('Ringkasan', 14, 52)
    
    doc.setFontSize(11)
    doc.text(`Total Omzet: Rp ${reportData.totalRevenue.toLocaleString('id-ID')}`, 14, 62)
    doc.text(`Total Modal: Rp ${reportData.totalCost.toLocaleString('id-ID')}`, 14, 70)
    doc.text(`Total Laba: Rp ${reportData.totalProfit.toLocaleString('id-ID')}`, 14, 78)
    doc.text(`Jumlah Transaksi: ${reportData.totalSales}`, 14, 86)

    // Sales table
    if (reportData.sales.length > 0) {
      const salesTableData = reportData.sales.map((sale: any) => [
        format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm'),
        `Rp ${Number(sale.total_amount).toLocaleString('id-ID')}`,
        `Rp ${Number(sale.profit).toLocaleString('id-ID')}`,
        sale.payment_method
      ])

      autoTable(doc, {
        startY: 96,
        head: [['Waktu', 'Total', 'Laba', 'Metode Pembayaran']],
        body: salesTableData,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] }
      })
    }

    // Top products table
    if (reportData.topProducts.length > 0) {
      const productsTableData = reportData.topProducts.map((item: any) => [
        item.products?.name || 'Unknown',
        item.quantity.toString()
      ])

      const finalY = (doc as any).lastAutoTable.finalY + 10

      doc.setFontSize(14)
      doc.text('Produk Terlaris', 14, finalY)

      autoTable(doc, {
        startY: finalY + 10,
        head: [['Nama Produk', 'Jumlah Terjual']],
        body: productsTableData,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] }
      })
    }

    doc.save(`laporan-kenaya-yummy-${selectedDate}.pdf`)
  }

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      ['Ringkasan Laporan'],
      ['Jenis', reportType === 'daily' ? 'Harian' : 'Bulanan'],
      ['Tanggal', format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })],
      [''],
      ['Total Omzet', reportData.totalRevenue],
      ['Total Modal', reportData.totalCost],
      ['Total Laba', reportData.totalProfit],
      ['Jumlah Transaksi', reportData.totalSales]
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan')

    // Sales sheet
    if (reportData.sales.length > 0) {
      const salesData = reportData.sales.map((sale: any) => ({
        'Waktu': format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm'),
        'Total': Number(sale.total_amount),
        'Laba': Number(sale.profit),
        'Metode Pembayaran': sale.payment_method
      }))
      const salesSheet = XLSX.utils.json_to_sheet(salesData)
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Penjualan')
    }

    // Top products sheet
    if (reportData.topProducts.length > 0) {
      const productsData = reportData.topProducts.map((item: any) => ({
        'Nama Produk': item.products?.name || 'Unknown',
        'Jumlah Terjual': item.quantity
      }))
      const productsSheet = XLSX.utils.json_to_sheet(productsData)
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Produk Terlaris')
    }

    XLSX.writeFile(workbook, `laporan-kenaya-yummy-${selectedDate}.xlsx`)
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
            <h1 className="text-3xl font-bold text-gray-800">Laporan</h1>
            <p className="text-gray-600 mt-1">Lihat dan ekspor laporan penjualan</p>
          </div>

          <div className="space-y-6">
            {/* Controls */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  Filter Laporan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Jenis Laporan</label>
                    <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Harian</SelectItem>
                        <SelectItem value="monthly">Bulanan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tanggal</label>
                    <Input
                      type={reportType === 'daily' ? 'date' : 'month'}
                      value={selectedDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Omzet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    Rp {reportData.totalRevenue.toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Laba</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    Rp {reportData.totalProfit.toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Jumlah Transaksi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {reportData.totalSales}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Buttons */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-orange-500" />
                  Ekspor Laporan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    onClick={exportPDF}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ekspor PDF
                  </Button>
                  <Button
                    onClick={exportExcel}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Table className="w-4 h-4 mr-2" />
                    Ekspor Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Produk Terlaris</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.topProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Belum ada data penjualan
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportData.topProducts.map((item: any, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-white rounded-lg border border-orange-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-800">
                            {item.products?.name || 'Unknown'}
                          </span>
                        </div>
                        <span className="font-semibold text-orange-600">
                          {item.quantity} terjual
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
