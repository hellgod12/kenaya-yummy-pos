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
import { Plus, Edit, Trash2, BookOpen, Search, Minus } from 'lucide-react'

interface ProductRecipe {
  id: string
  product_id: string
  raw_material_id: string
  quantity_used: number
  created_at: string
  products?: { name: string }
  raw_materials?: { name: string, unit: string, cost_per_unit: number }
}

interface Product {
  id: string
  name: string
}

interface RawMaterial {
  id: string
  name: string
  unit: string
  cost_per_unit: number
}

interface RecipeIngredient {
  raw_material_id: string
  quantity_used: string
}

interface ProductWithRecipes {
  id: string
  name: string
  recipes: ProductRecipe[]
}

export default function RecipesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [productsWithRecipes, setProductsWithRecipes] = useState<ProductWithRecipes[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { raw_material_id: '', quantity_used: '' }
  ])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProductsWithRecipes()
      fetchProducts()
      fetchRawMaterials()
    }
  }, [user])

  const fetchProductsWithRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, product_recipes(*, raw_materials(name, unit, cost_per_unit))')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      // Transform product_recipes to recipes
      const transformedData = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        recipes: (product as any).product_recipes || []
      }))
      setProductsWithRecipes(transformedData)
    } catch (error) {
      console.error('Error fetching products with recipes:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, unit, cost_per_unit')
        .order('name')
      
      if (error) throw error
      setRawMaterials(data || [])
    } catch (error) {
      console.error('Error fetching raw materials:', error)
    }
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { raw_material_id: '', quantity_used: '' }])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string) => {
    const newIngredients = [...ingredients]
    newIngredients[index][field] = value
    setIngredients(newIngredients)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('SAVE RECIPE START')
    console.log('selectedProductId:', selectedProductId)
    console.log('ingredients:', ingredients)
    
    if (!selectedProductId) {
      alert('Pilih produk terlebih dahulu')
      return
    }

    try {
      // Validate ingredients
      const validIngredients = ingredients.filter(ing => ing.raw_material_id && ing.quantity_used)
      console.log('validIngredients:', validIngredients)
      
      if (validIngredients.length === 0) {
        alert('Tambahkan minimal satu bahan baku')
        return
      }

      // Delete existing recipes for this product
      console.log('Deleting existing recipes for product:', selectedProductId)
      const deleteResult = await supabase
        .from('product_recipes')
        .delete()
        .eq('product_id', selectedProductId)
      console.log('Delete result:', deleteResult)

      // Insert all new recipes
      const recipesToInsert = validIngredients.map(ing => ({
        product_id: selectedProductId,
        raw_material_id: ing.raw_material_id,
        quantity_used: parseFloat(ing.quantity_used)
      }))
      
      console.log('recipesToInsert:', recipesToInsert)

      const { error } = await supabase
        .from('product_recipes')
        .insert(recipesToInsert)

      console.log('Insert error:', error)
      if (error) throw error

      // Update product HPP
      console.log('Calling updateProductHPP for product:', selectedProductId)
      await updateProductHPP(selectedProductId)

      setIsDialogOpen(false)
      resetForm()
      fetchProductsWithRecipes()
      console.log('SAVE RECIPE SUCCESS')
    } catch (error) {
      console.error('Error saving recipe:', error)
      console.error('ERROR DETAILS:', JSON.stringify(error, null, 2))
      alert('Terjadi kesalahan saat menyimpan resep')
    }
  }

  const updateProductHPP = async (productId: string) => {
    try {
      console.log('UPDATE PRODUCT HPP START')
      console.log('productId:', productId)
      
      // Calculate HPP directly from recipes
      const { data: recipes, error: recipesError } = await supabase
        .from('product_recipes')
        .select('quantity_used, raw_materials(cost_per_unit)')
        .eq('product_id', productId)
      
      console.log('recipes data:', recipes)
      console.log('recipes error:', recipesError)
      
      if (recipesError) throw recipesError

      // Calculate total HPP
      let totalHPP = 0
      if (recipes) {
        totalHPP = recipes.reduce((sum, recipe) => {
          const materials = recipe.raw_materials as any
          console.log('recipe:', recipe, 'materials:', materials, 'type:', typeof materials, 'isArray:', Array.isArray(materials))
          
          let costPerUnit = 0
          
          // Handle both array and object cases
          if (Array.isArray(materials) && materials.length > 0) {
            costPerUnit = materials[0].cost_per_unit
            console.log('Array case - cost_per_unit:', costPerUnit)
          } else if (materials && !Array.isArray(materials) && materials.cost_per_unit) {
            costPerUnit = materials.cost_per_unit
            console.log('Object case - cost_per_unit:', costPerUnit)
          }
          
          if (costPerUnit > 0) {
            const cost = recipe.quantity_used * costPerUnit
            console.log('quantity_used:', recipe.quantity_used, 'cost_per_unit:', costPerUnit, 'cost:', cost)
            return sum + cost
          }
          
          console.log('No valid cost_per_unit found, skipping this recipe')
          return sum
        }, 0)
      }
      
      console.log('totalHPP calculated:', totalHPP)

      // Update product HPP
      const updateResult = await supabase
        .from('products')
        .update({ hpp: totalHPP })
        .eq('id', productId)
        .select()

      console.log('updateResult:', updateResult)

      if (updateResult.error) {
        console.error('UPDATE ERROR:', updateResult.error)
        throw updateResult.error
      }
      
      console.log('UPDATE PRODUCT HPP SUCCESS')
    } catch (error) {
      console.error('Error updating product HPP:', error)
      console.error('ERROR DETAILS:', JSON.stringify(error, null, 2))
    }
  }

  const handleEdit = (product: ProductWithRecipes) => {
    setEditingProductId(product.id)
    setSelectedProductId(product.id)
    
    // Load existing ingredients
    const existingIngredients = product.recipes.map(recipe => ({
      raw_material_id: recipe.raw_material_id,
      quantity_used: recipe.quantity_used.toString()
    }))
    
    setIngredients(existingIngredients.length > 0 ? existingIngredients : [{ raw_material_id: '', quantity_used: '' }])
    setIsDialogOpen(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua resep untuk produk ini?')) return
    
    try {
      const { error } = await supabase
        .from('product_recipes')
        .delete()
        .eq('product_id', productId)
      
      if (error) throw error
      
      // Update product HPP to 0
      await supabase
        .from('products')
        .update({ hpp: 0 })
        .eq('id', productId)
      
      fetchProductsWithRecipes()
    } catch (error) {
      console.error('Error deleting recipes:', error)
      alert('Terjadi kesalahan saat menghapus resep')
    }
  }

  const resetForm = () => {
    setSelectedProductId('')
    setEditingProductId(null)
    setIngredients([{ raw_material_id: '', quantity_used: '' }])
  }

  const filteredProducts = productsWithRecipes.filter(product => {
    return product.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const calculateProductHPP = (recipes: ProductRecipe[]) => {
    return recipes.reduce((total, recipe) => {
      const material = recipe.raw_materials
      if (material) {
        return total + (recipe.quantity_used * material.cost_per_unit)
      }
      return total
    }, 0)
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Resep Produk</h1>
                <p className="text-gray-600 mt-1">Kelola resep produk untuk perhitungan HPP</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger>
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Resep
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProductId ? 'Edit Resep Produk' : 'Tambah Resep Baru'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Produk</label>
                      <Select value={selectedProductId || ''} onValueChange={(value) => setSelectedProductId(value || '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Bahan Baku</label>
                        <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                          <Plus className="w-4 h-4 mr-1" />
                          Tambah Bahan
                        </Button>
                      </div>
                      
                      {ingredients.map((ingredient, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <div className="flex-1">
                            <Select
                              value={ingredient.raw_material_id || ''}
                              onValueChange={(value) => updateIngredient(index, 'raw_material_id', value || '')}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih bahan baku" />
                              </SelectTrigger>
                              <SelectContent>
                                {rawMaterials.map((material) => (
                                  <SelectItem key={material.id} value={material.id}>
                                    {material.name} ({material.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32">
                            <Input
                              type="number"
                              placeholder="Jumlah"
                              value={ingredient.quantity_used}
                              onChange={(e) => updateIngredient(index, 'quantity_used', e.target.value)}
                              required
                            />
                          </div>
                          {ingredients.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIngredient(index)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500">
                      {editingProductId ? 'Update Resep' : 'Simpan Resep'}
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
                      placeholder="Cari produk..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredProducts.map((product) => {
                    const hpp = calculateProductHPP(product.recipes || [])
                    return (
                      <Card key={product.id} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {product.recipes && product.recipes.length > 0 ? (
                            <>
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-700">Total HPP: </span>
                                <span className="text-sm font-bold text-gray-900">
                                  Rp {hpp.toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Bahan Baku</th>
                                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Jumlah</th>
                                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Biaya</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {product.recipes.map((recipe) => {
                                      const material = recipe.raw_materials
                                      const cost = material ? recipe.quantity_used * material.cost_per_unit : 0
                                      return (
                                        <tr key={recipe.id} className="border-b border-gray-100">
                                          <td className="py-2 px-2 text-gray-600">
                                            {material?.name || 'Unknown'} ({material?.unit || ''})
                                          </td>
                                          <td className="py-2 px-2 text-gray-600">{recipe.quantity_used}</td>
                                          <td className="py-2 px-2 text-gray-600">
                                            Rp {cost.toLocaleString('id-ID')}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Belum ada resep</p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
