"use client"

import type React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X } from "lucide-react"
import type { SortConfig } from "@/hooks/use-data-table"

interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  filterType?: "text" | "select" | "boolean"
  filterOptions?: { label: string; value: any }[]
  render?: (value: any, item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  sortConfig: SortConfig | null
  searchTerm: string
  filters: Record<string, any>
  onSort: (key: string) => void
  onSearch: (term: string) => void
  onFilter: (key: string, value: any) => void
  onClearFilters: () => void
  loading?: boolean
  emptyMessage?: string
  actions?: (item: T) => React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  sortConfig,
  searchTerm,
  filters,
  onSort,
  onSearch,
  onFilter,
  onClearFilters,
  loading = false,
  emptyMessage = "Aucune donnée disponible",
  actions,
}: DataTableProps<T>) {
  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortConfig.direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const hasActiveFilters =
    Object.values(filters).some((value) => value !== "" && value !== null && value !== undefined) || searchTerm !== ""

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Column Filters */}
        {columns
          .filter((col) => col.filterable)
          .map((column) => (
            <div key={String(column.key)} className="min-w-40">
              {column.filterType === "select" ? (
                <Select
                  value={filters[String(column.key)] || ""}
                  onValueChange={(value) => onFilter(String(column.key), value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Filtrer ${column.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {column.filterOptions?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={`Filtrer ${column.label}`}
                  value={filters[String(column.key)] || ""}
                  onChange={(e) => onFilter(String(column.key), e.target.value)}
                />
              )}
            </div>
          ))}

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Effacer les filtres
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)}>
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => onSort(String(column.key))}
                    >
                      {column.label}
                      {getSortIcon(String(column.key))}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id || index}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render ? column.render(item[column.key], item) : String(item[column.key] || "")}
                    </TableCell>
                  ))}
                  {actions && <TableCell className="text-right">{actions(item)}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Summary */}
      {data.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Affichage de {data.length} résultat{data.length > 1 ? "s" : ""}
          {hasActiveFilters && " (filtré)"}
        </div>
      )}
    </div>
  )
}
