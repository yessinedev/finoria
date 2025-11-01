import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Percent } from "lucide-react";
import { db } from "@/lib/database";
import type { TVA } from "@/types/types";
import { useToast } from "@/hooks/use-toast";

interface VatManagementProps {
  className?: string;
}

export default function VatManagement({ className }: VatManagementProps) {
  const { toast } = useToast();
  const [tvaRates, setTvaRates] = useState<TVA[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTva, setEditingTva] = useState<TVA | null>(null);
  const [canDeleteMap, setCanDeleteMap] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState({
    rate: 0,
    isActive: true,
  });

  useEffect(() => {
    loadTvaRates();
  }, []);

  const loadTvaRates = async () => {
    try {
      const result = await db.tva.getAll();
      if (result.success) {
        setTvaRates(result.data || []);
        // Check which TVA rates can be deleted
        const deleteChecks = await Promise.all(
          (result.data || []).map(async (tva) => {
            const checkResult = await db.tva.canDelete(tva.id);
            return { id: tva.id, canDelete: checkResult.success && checkResult.data };
          })
        );
        const newCanDeleteMap: Record<number, boolean> = {};
        deleteChecks.forEach(({ id, canDelete }) => {
          newCanDeleteMap[id] = canDelete;
        });
        setCanDeleteMap(newCanDeleteMap);
      }
    } catch (error) {
      console.error("Error loading TVA rates:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des taux de TVA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const result = await db.tva.create(formData);
      if (result.success) {
        await loadTvaRates();
        resetForm();
        toast({
          title: "Succès",
          description: "Taux de TVA créé avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la création");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création du taux de TVA",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingTva) return;
    
    try {
      const result = await db.tva.update(editingTva.id, formData);
      if (result.success) {
        await loadTvaRates();
        resetForm();
        toast({
          title: "Succès",
          description: "Taux de TVA mis à jour avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la mise à jour du taux de TVA",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await db.tva.delete(id);
      if (result.success) {
        await loadTvaRates();
        toast({
          title: "Succès",
          description: "Taux de TVA supprimé avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression du taux de TVA",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      rate: 0,
      isActive: true,
    });
    setEditingTva(null);
    setIsFormOpen(false);
  };

  const handleEdit = (tva: TVA) => {
    setEditingTva(tva);
    setFormData({
      rate: tva.rate,
      isActive: tva.isActive,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTva) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Gestion des taux de TVA
        </CardTitle>
        <CardDescription>
          Gérez les différents taux de TVA utilisés dans votre entreprise
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {tvaRates.length} taux de TVA configurés
          </div>
          <Button onClick={() => { resetForm(); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un taux
          </Button>
        </div>

        {isFormOpen && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingTva ? "Modifier le taux de TVA" : "Nouveau taux de TVA"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Taux (%) *</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={formData.rate.toString()}
                    onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) || 0 })}
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Taux actif</Label>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingTva ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taux</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : tvaRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Aucun taux de TVA configuré
                  </TableCell>
                </TableRow>
              ) : (
                tvaRates.map((tva) => (
                  <TableRow key={tva.id}>
                    <TableCell>{tva.rate}%</TableCell>
                    <TableCell>
                      <Badge variant={tva.isActive ? "default" : "secondary"}>
                        {tva.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(tva)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(tva.id)}
                          disabled={!canDeleteMap[tva.id]}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}