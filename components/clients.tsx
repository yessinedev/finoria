"use client";

import type { Client } from "@/types/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
  });

  // Data table configuration
  const {
    data: filteredClients,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(clients, { key: "name", direction: "asc" });

  const columns = [
    {
      key: "name" as keyof Client,
      label: "Nom",
      sortable: true,
      filterable: true,
      render: (value: string, client: Client) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{client.company}</div>
        </div>
      ),
    },
    {
      key: "email" as keyof Client,
      label: "Email",
      sortable: true,
      filterable: true,
    },
    {
      key: "phone" as keyof Client,
      label: "Téléphone",
      sortable: true,
      filterable: true,
    },
    {
      key: "createdAt" as keyof Client,
      label: "Date de création",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
  ];

  useEffect((): (() => void) => {
    loadClients();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
      if (table === "clients") {
        loadClients(); // Refresh data when clients change
      }
    });

    return unsubscribe;
  }, []);

  const loadClients = async () => {
    setLoading(true);
    setError(null);

    const result = await db.clients.getAll();
    if (result.success) {
      setClients(result.data || []);
    } else {
      setError(result.error || "Erreur lors du chargement des clients");
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let result;
      if (editingClient) {
        result = await db.clients.update(editingClient.id, formData);
      } else {
        result = await db.clients.create(formData);
      }

      if (result.success) {
        await loadClients(); // Refresh the list
        resetForm();
      } else {
        setError(result.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      setError("Erreur inattendue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", address: "", company: "" });
    setEditingClient(null);
    setIsDialogOpen(false);
    setError(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
      company: client.company,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      return;
    }

    const result = await db.clients.delete(id);
    if (result.success) {
      await loadClients();
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const renderActions = (client: Client) => (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDelete(client.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des clients</h1>
          <p className="text-muted-foreground">
            Gérez votre base de données clients ({clients.length} client
            {clients.length > 1 ? "s" : ""})
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Modifier le client" : "Nouveau client"}
              </DialogTitle>
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
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Enregistrement..."
                    : editingClient
                    ? "Modifier"
                    : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
            <Users className="h-5 w-5" />
            Liste des clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredClients}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun client trouvé"
            actions={renderActions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
