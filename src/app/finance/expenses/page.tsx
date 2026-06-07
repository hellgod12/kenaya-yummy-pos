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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, DollarSign, Search } from 'lucide-react'

interface Expense {
  id: string
  expense_date: string
  category: string
  description: string
  amount: number
  created_by: string
  created_at: string
}

interface FormData {
  expense_date: string
  category: string
  description: string
  amount: string
}

const categories = [
  'Electricity',
  'Water',
  'Salary',
  'Rent',
  'Raw Materials',
  'Transportation',
  'Marketing',
  'Other'
]

export default function ExpensesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formData, setFormData] = useState<FormData>({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Other',
    description: '',
    amount: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchExpenses()
    }
  }, [user])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
      
      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const expenseData = {
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        created_by: user!.id
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)
        
        if (error) throw error
      }

      setIsDialogOpen(false)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Terjadi kesalahan saat menyimpan pengeluaran')
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString()
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Terjadi kesalahan saat menghapus pengeluaran')
    }
  }

  const resetForm = () => {
    setFormData({
      expense_date: new Date().toISOString().split('T')[0],
      category: 'Other',
      description: '',
      amount: ''
    })
    setEditingExpense(null)
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

  if (loading || !user) {
    return null
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Pengeluaran</h1>
                <p className="text-gray-600 mt-1">Kelola pengeluaran bisnis</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger>
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Pengeluaran
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tanggal</label>
                      <Input
                        type="date"
                        value={formData.expense_date}
                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Kategori</label>
                      <Select value={formData.category || 'Other'} onValueChange={(value) => setFormData({ ...formData, category: value || 'Other' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Deskripsi</label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500">
                      {editingExpense ? 'Update' : 'Simpan'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Summary Card */}
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  Total Pengeluaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">
                  Rp {totalExpenses.toLocaleString('id-ID')}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Cari pengeluaran..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value || 'all')}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Kategori</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Deskripsi</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Jumlah</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-600">{expense.expense_date || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                              {expense.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">{expense.description}</td>
                          <td className="py-3 px-4 text-gray-600">
                            Rp {expense.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(expense)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(expense.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
