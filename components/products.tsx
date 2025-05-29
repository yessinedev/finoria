"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Package, AlertCircle } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import ProductFormModal from "@/components/ProductFormModal"
import CategoryManagerModal from "@/components/CategoryManagerModal"
import { db } from "@/lib/database"
import type { Product, Category } from "@/types/types"
import { Badge } from "@/components/ui/badge"

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

  const handleProductFormSubmit = async (formData: any, editingProduct: Product | null) => {
    setSaving(true)
    setError(null)
    try {
      let result
      if (editingProduct) {
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
          <CategoryManagerModal
            open={isCategoryManagerOpen}
            onOpenChange={setIsCategoryManagerOpen}
            categories={categories}
            onCategoriesChange={setCategories}
          />
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau produit
          </Button>
          <ProductFormModal
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSubmit={handleProductFormSubmit}
            editingProduct={editingProduct}
            categories={categories}
            saving={saving}
            error={error}
            formData={formData}
            setFormData={setFormData}
            onReset={resetForm}
          />
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
