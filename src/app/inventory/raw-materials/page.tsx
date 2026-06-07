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
import { Plus, Edit, Trash2, Package, Search } from 'lucide-react'

interface RawMaterial {
  id: string
  name: string
  unit: string
  cost_per_unit: number
  stock: number
  created_at: string
}

const units = ['kg', 'gram', 'liter', 'ml', 'pcs']

export default function RawMaterialsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    cost_per_unit: '',
    stock: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchRawMaterials()
    }
  }, [user])

  const fetchRawMaterials = async () => {
    try {
      console.log('FETCHING RAW MATERIALS...')
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name')
      
      console.log('FETCH RESULT:', { data, error })
      
      if (error) throw error
      setRawMaterials(data || [])
    } catch (error) {
      console.error('ERROR FETCHING RAW MATERIALS:', error)
      console.error('FETCH ERROR DETAILS:', JSON.stringify(error, null, 2))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('FORM DATA:', formData)
      console.log('USER:', user)
      
      const materialData = {
        name: formData.name,
        unit: formData.unit,
        cost_per_unit: parseFloat(formData.cost_per_unit),
        stock: parseFloat(formData.stock)
      }

      console.log('MATERIAL DATA TO INSERT:', materialData)

      if (editingMaterial) {
        console.log('UPDATING MATERIAL ID:', editingMaterial.id)
        const { error, data } = await supabase
          .from('raw_materials')
          .update(materialData)
          .eq('id', editingMaterial.id)
          .select()
        
        console.log('UPDATE RESULT:', { error, data })
        if (error) throw error
      } else {
        console.log('INSERTING NEW MATERIAL')
        const { error, data } = await supabase
          .from('raw_materials')
          .insert(materialData)
          .select()
        
        console.log('INSERT RESULT:', { error, data })
        if (error) throw error
      }

      setIsDialogOpen(false)
      resetForm()
      fetchRawMaterials()
    } catch (error) {
      console.error('RAW MATERIAL INSERT ERROR:', error)
      console.error('ERROR DETAILS:', JSON.stringify(error, null, 2))
      alert('Terjadi kesalahan saat menyimpan bahan baku. Cek console untuk detail.')
    }
  }

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material)
    setFormData({
      name: material.name,
      unit: material.unit,
      cost_per_unit: material.cost_per_unit.toString(),
      stock: material.stock.toString()
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus bahan baku ini?')) return
    
    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchRawMaterials()
    } catch (error) {
      console.error('Error deleting raw material:', error)
      alert('Terjadi kesalahan saat menghapus bahan baku')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      unit: 'kg',
      cost_per_unit: '',
      stock: ''
    })
    setEditingMaterial(null)
  }

  const filteredMaterials = rawMaterials.filter(material => {
    return material.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

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
                <h1 className="text-3xl font-bold text-gray-800">Bahan Baku</h1>
                <p className="text-gray-600 mt-1">Kelola bahan baku untuk perhitungan HPP</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger>
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Bahan Baku
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nama Bahan</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Satuan</label>
                      <Select value={formData.unit || 'kg'} onValueChange={(value) => setFormData({ ...formData, unit: value || 'kg' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Harga per Satuan (Rp)</label>
                      <Input
                        type="number"
                        value={formData.cost_per_unit}
                        onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Stok</label>
                      <Input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500">
                      {editingMaterial ? 'Update' : 'Simpan'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Cari bahan baku..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Nama</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Satuan</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Harga per Satuan</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Stok</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map((material) => (
                        <tr key={material.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{material.name}</td>
                          <td className="py-3 px-4 text-gray-600 capitalize">{material.unit}</td>
                          <td className="py-3 px-4 text-gray-600">
                            Rp {material.cost_per_unit.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{material.stock}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(material)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(material.id)}
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
