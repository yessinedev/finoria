"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Package, Settings, AlertCircle } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import CategoryManager from "@/components/category-manager"
import { db } from "@/lib/database"

interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string
  stock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Category {
  id: number
  name: string
  description: string
  color: string
  isActive: boolean,
  createdAt: string,
  updatedAt: string,
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
    stock: 0,
    isActive: true,
  })

  // Data table configuration
  const {
    data: filteredProducts,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(products, { key: "name", direction: "asc" })

  const activeCategories = categories.filter((cat) => cat.isActive)

  const columns = [
    {
      key: "name" as keyof Product,
      label: "Nom",
      sortable: true,
      filterable: true,
      render: (value: string, product: Product) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{product.description}</div>
        </div>
      ),
    },
    {
      key: "category" as keyof Product,
      label: "Catégorie",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: categories.map((cat) => ({ label: cat.name, value: cat.name })),
      render: (value: string) => {
        const category = categories.find((cat) => cat.name === value)
        return (
          <Badge
            variant="outline"
            className={`bg-${category?.color || "gray"}-100 text-${category?.color || "gray"}-800 border-${category?.color || "gray"}-200`}
          >
            {value}
          </Badge>
        )
      },
    },
    {
      key: "price" as keyof Product,
      label: "Prix",
      sortable: true,
      render: (value: number) => `${value.toFixed(2)} €`,
    },
    {
      key: "stock" as keyof Product,
      label: "Stock",
      sortable: true,
      render: (value: number) => (value > 0 ? value.toString() : "Service"),
    },
    {
      key: "isActive" as keyof Product,
      label: "Statut",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: [
        { label: "Actif", value: true },
        { label: "Inactif", value: false },
      ],
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>{value ? "Actif" : "Inactif"}</Badge>
      ),
    },
  ]

  useEffect((): (() => void) => {
    loadData()

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
      if (table === "products" || table === "categories") {
        loadData()
      }
    })

    return unsubscribe
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [productsResult, categoriesResult] = await Promise.all([db.products.getAll(), db.categories.getAll()])

      if (productsResult.success) {
        console.log(productsResult.data)
        setProducts(productsResult.data || [])
      } else {
        setError(productsResult.error || "Erreur lors du chargement des produits")
      }

      if (categoriesResult.success) {
        setCategories(categoriesResult.data || [])
      } else {
        setError(categoriesResult.error || "Erreur lors du chargement des catégories")
      }
    } catch (error) {
      setError("Erreur inattendue lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let result
      if (editingProduct) {
        console.log(formData)
        result = await db.products.update(editingProduct.id, formData)
      } else {
        result = await db.products.create(formData)
      }

      if (result.success) {
        await loadData()
        resetForm()
      } else {
        setError(result.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      setError("Erreur inattendue lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", price: 0, category: "", stock: 0, isActive: true })
    setEditingProduct(null)
    setIsDialogOpen(false)
    setError(null)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      isActive: product.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      return
    }

    const result = await db.products.delete(id)
    if (result.success) {
      await loadData()
    } else {
      setError(result.error || "Erreur lors de la suppression")
    }
  }

  const toggleProductStatus = async (id: number) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    console.log(product)
    const result = await db.products.update(id, { ...product, isActive: !product.isActive })
    if (result.success) {
      await loadData()
    } else {
      setError(result.error || "Erreur lors de la mise à jour")
    }
  }

  const renderActions = (product: Product) => (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => toggleProductStatus(product.id)} className="text-xs">
        {product.isActive ? "Désactiver" : "Activer"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des produits</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue de produits et services ({products.length} produit{products.length > 1 ? "s" : ""})
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Gérer les catégories
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-full sm:max-w-[900px] px-4" style={{ maxHeight: "90vh", overflowY: "auto" }}>
              <DialogHeader>
                <DialogTitle>Gestion des catégories</DialogTitle>
              </DialogHeader>
              <CategoryManager
                categories={categories}
                onCategoriesChange={setCategories}
                onClose={() => setIsCategoryManagerOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau produit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
              </DialogHeader>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom du produit</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                      disabled={saving}
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {activeCategories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={saving}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Prix unitaire (€)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock (0 pour les services)</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={saving}
                  />
                  <Label htmlFor="isActive">Produit actif</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Enregistrement..." : editingProduct ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && !isDialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalogue produits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredProducts}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun produit trouvé"
            actions={renderActions}
          />
        </CardContent>
      </Card>
    </div>
  )
}
