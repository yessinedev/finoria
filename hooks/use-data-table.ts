"use client"

import { useState, useMemo } from "react"

export interface SortConfig {
  key: string
  direction: "asc" | "desc"
}

export interface FilterConfig {
  [key: string]: string | number | boolean
}

export function useDataTable<T extends Record<string, any>>(data: T[], initialSort?: SortConfig) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSort || null)
  const [filters, setFilters] = useState<FilterConfig>({})
  const [searchTerm, setSearchTerm] = useState("")

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filteredData = [...data]

    // Apply search filter
    if (searchTerm) {
      filteredData = filteredData.filter((item) =>
        Object.values(item).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        filteredData = filteredData.filter((item) => {
          const itemValue = item[key]
          if (typeof value === "boolean") {
            return itemValue === value
          }
          if (typeof value === "string") {
            return String(itemValue).toLowerCase().includes(value.toLowerCase())
          }
          return itemValue === value
        })
      }
    })

    // Apply sorting
    if (sortConfig) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.localeCompare(bValue, "fr", { numeric: true })
          return sortConfig.direction === "asc" ? comparison : -comparison
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }

    return filteredData
  }, [data, sortConfig, filters, searchTerm])

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" }
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" }
      }
      return null
    })
  }

  const handleFilter = (key: string, value: string | number | boolean) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm("")
  }

  return {
    data: processedData,
    sortConfig,
    filters,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    totalItems: data.length,
    filteredItems: processedData.length,
  }
}
