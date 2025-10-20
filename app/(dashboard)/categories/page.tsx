"use client";

import type React from "react";
import { useState, useEffect } from "react";
import type { Category } from "@/types/types";
import CategoryManager from "@/components/category/category-manager";
import { db } from "@/lib/database";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const result = await db.categories.getAll();
        if (result.success) {
          setCategories(result.data || []);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestion des catégories</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestion des catégories</h1>
        <p className="text-muted-foreground">
          Gérez les catégories utilisées pour organiser vos produits ({categories.length} catégorie{categories.length !== 1 ? 's' : ''})
        </p>
      </div>
      
      <CategoryManager 
        categories={categories}
        onCategoriesChange={setCategories}
        onClose={() => {}}
      />
    </div>
  );
}