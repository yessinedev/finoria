"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Package, AlertCircle, AlertTriangle, Tag, Percent, MoreVertical } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import ProductFormModal from "@/components/products/ProductFormModal"
import { db } from "@/lib/database"
import type { Product, Category, TVA, Unit } from "@/types/types"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ActionsDropdown } from "@/components/common/actions-dropdown"

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tvaRates, setTvaRates] = useState<TVA[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const { toast } = useToast()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    stock: 0,
    isActive: true,
    reference: "",
    tvaId: undefined,
    unitId: undefined,
    sellingPriceHT: undefined,
    sellingPriceTTC: undefined,
    purchasePriceHT: undefined,
    fodecApplicable: false,
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

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const columns = [
    {
      key: "name" as keyof Product,
      label: "Nom",
      sortable: true,
      filterable: true,
      render: (value: string, product: Product) => (
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4" />
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">{product.description}</div>
          </div>
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
        return (
          <Badge variant="outline">
            {value}
          </Badge>
        )
      },
    },
    {
      key: "price" as keyof Product,
      label: "Prix de vente",
      sortable: true,
      render: (value: number, product: Product) => {
        // Use sellingPriceTTC if available, otherwise fall back to sellingPriceHT
        const price = product.sellingPriceTTC ?? product.sellingPriceHT ?? 0;
        return price ? `${price.toFixed(2)} DNT` : "—";
      },
    },
    {
      key: "purchasePrice" as keyof Product,
      label: "Prix d'achat",
      sortable: true,
      render: (value: number, product: Product) => {
        const price = product.purchasePriceHT ?? 0;
        return price ? `${price.toFixed(2)} DNT` : "—";
      },
    },
    {
      key: "stock" as keyof Product,
      label: "Stock",
      sortable: true,
      render: (value: number, product: Product) => (
        product.category?.toLowerCase() === "service" ? "Service" : value.toString()
      ),
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

    return () => {
      unsubscribe();
    };
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [productsResult, categoriesResult, tvaResult, unitsResult] = await Promise.all([
        db.products.getAll(), 
        db.categories.getAll(),
        db.tva.getAll(),
        db.units.getAll()
      ])

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
      
      if (tvaResult.success) {
        setTvaRates(tvaResult.data || [])
      } else {
        setError(tvaResult.error || "Erreur lors du chargement des taux de TVA")
      }

      if (unitsResult.success) {
        setUnits(unitsResult.data || [])
      } else {
        setError(unitsResult.error || "Erreur lors du chargement des unités")
      }
    } catch (error) {
      setError("Erreur inattendue lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const handleProductFormSubmit = async (formData: any, editingProduct: Product | null) => {
    setSaving(true);
    setError(null);
    try {
      let result;
      if (editingProduct) {
        result = await db.products.update(editingProduct.id, formData);
      } else {
        result = await db.products.create(formData);
      }
      if (result.success) {
        await loadData();
        resetForm();
        toast({
          title: "Succès",
          description: editingProduct 
            ? "Produit mis à jour avec succès" 
            : "Produit créé avec succès",
        });
      } else {
        setError(result.error || "Erreur lors de la sauvegarde");
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la sauvegarde",
          variant: "destructive",
        });
      }
    } catch (error) {
      setError("Erreur inattendue lors de la sauvegarde");
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const resetForm = () => {
    setFormData({ 
      name: "", 
      description: "", 
      category: "", 
      stock: 0, 
      isActive: true,
      reference: "",
      tvaId: undefined,
      unitId: undefined,
      sellingPriceHT: undefined,
      sellingPriceTTC: undefined,
      purchasePriceHT: undefined,
      fodecApplicable: false,
    })
    setEditingProduct(null)
    setIsDialogOpen(false)
    setError(null)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,

      category: product.category,
      stock: product.stock,
      isActive: product.isActive,
      reference: product.reference || "",
      tvaId: product.tvaId,
      unitId: product.unitId,
      sellingPriceHT: product.sellingPriceHT,
      sellingPriceTTC: product.sellingPriceTTC,
      purchasePriceHT: product.purchasePriceHT,
      fodecApplicable: product.fodecApplicable || false,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      const result = await db.products.delete(productToDelete.id)
      if (result.success) {
        await loadData()
        setIsDeleteDialogOpen(false)
        setProductToDelete(null)
        toast({
          title: "Succès",
          description: "Produit supprimé avec succès",
        })
      } else {
        throw new Error(result.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression du produit",
        variant: "destructive",
      })
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
    <ActionsDropdown
      actions={[
        {
          label: product.isActive ? "Désactiver" : "Activer",
          onClick: () => toggleProductStatus(product.id),
        },
        {
          label: "Modifier",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(product),
        },
        {
          label: "Supprimer",
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDelete(product),
          className: "text-red-600",
        },
      ]}
    />
  )

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des produits</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des produits</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue de produits et services ({products.length} produit{products.length > 1 ? "s" : ""})
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/categories">
            <Button variant="outline">
              <Tag className="h-4 w-4 mr-2" />
              Catégories
            </Button>
          </Link>
          <Link href="/units">
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Gérer unités
            </Button>
          </Link>
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
            tvaRates={tvaRates}
            units={units}
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
            data={currentProducts}
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredProducts.length)} sur {filteredProducts.length} produits
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => paginate(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => paginate(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => paginate(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le produit "{productToDelete?.name}" ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}