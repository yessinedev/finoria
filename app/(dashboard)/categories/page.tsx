"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Plus, Tag, AlertCircle } from "lucide-react";
import { db } from "@/lib/database";
import type { Category } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect((): (() => void) => {
    loadCategories();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
      if (table === "categories") {
        loadCategories();
      }
    });

    return unsubscribe;
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await db.categories.getAll();
      if (result.success) {
        setCategories(result.data || []);
      } else {
        setError(result.error || "Erreur lors du chargement des catégories");
      }
    } catch (error) {
      setError("Erreur inattendue lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la catégorie ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await db.categories.create({
        name: newCategoryName.trim(),
        description: "",
        color: "blue",
        isActive: true,
      });

      if (result.success) {
        setNewCategoryName("");
        toast({
          title: "Succès",
          description: "Catégorie créée avec succès",
        });
      } else {
        setError(result.error || "Erreur lors de la création de la catégorie");
      }
    } catch (error) {
      setError("Erreur inattendue lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateCategory();
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des catégories</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des catégories</h1>
          <p className="text-muted-foreground">
            Gérez les catégories utilisées pour organiser vos produits ({categories.length} catégorie{categories.length > 1 ? "s" : ""})
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Créer une nouvelle catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nom de la catégorie"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={saving}
            />
            <Button onClick={handleCreateCategory} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Liste des catégories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune catégorie trouvée. Créez votre première catégorie ci-dessus.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div 
                  key={category.id} 
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}