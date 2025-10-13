"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/database";

export default function Settings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
    email: "",
    taxId: "",
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    prefix: "",
    nextNumber: 1001,
    dueDays: 30,
    taxRate: 19,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Check if electronAPI is available
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }
      
      // Load settings from database
      const response = await db.settings.get();
      if (response.success && response.data) {
        const settings = response.data;
        setCompanyInfo({
          name: settings.companyName || "",
          address: settings.address || "",
          city: settings.city || "",
          postalCode: settings.postalCode || "",
          country: settings.country || "",
          phone: settings.phone || "",
          email: settings.email || "",
          taxId: settings.taxId || "",
        });
        
        setInvoiceSettings({
          prefix: settings.invoicePrefix || "INV",
          nextNumber: settings.nextInvoiceNumber || 1001,
          dueDays: settings.paymentDueDays || 30,
          taxRate: settings.defaultTaxRate || 19,
        });
      } else {
        throw new Error(response.error || "Failed to load settings");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des paramètres: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if electronAPI is available
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }
      
      // Save settings to database
      const settingsData = {
        companyName: companyInfo.name,
        address: companyInfo.address,
        city: companyInfo.city,
        postalCode: companyInfo.postalCode,
        country: companyInfo.country,
        phone: companyInfo.phone,
        email: companyInfo.email,
        taxId: companyInfo.taxId,
        invoicePrefix: invoiceSettings.prefix,
        nextInvoiceNumber: invoiceSettings.nextNumber,
        paymentDueDays: invoiceSettings.dueDays,
        defaultTaxRate: invoiceSettings.taxRate,
      };
      
      const response = await db.settings.update(settingsData);
      if (response.success) {
        toast({
          title: "Paramètres enregistrés",
          description: "Les paramètres de l'entreprise ont été enregistrés avec succès.",
        });
      } else {
        throw new Error(response.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement des paramètres: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div>Chargement des paramètres...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Paramètres de l'entreprise
          </h1>
          <p className="text-muted-foreground">
            Configurez les informations de votre entreprise et les paramètres par défaut
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de l'entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={companyInfo.city}
                  onChange={(e) => setCompanyInfo({...companyInfo, city: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input
                  id="postalCode"
                  value={companyInfo.postalCode}
                  onChange={(e) => setCompanyInfo({...companyInfo, postalCode: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={companyInfo.country}
                onChange={(e) => setCompanyInfo({...companyInfo, country: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Numéro d'identification fiscale</Label>
              <Input
                id="taxId"
                value={companyInfo.taxId}
                onChange={(e) => setCompanyInfo({...companyInfo, taxId: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Paramètres de facturation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Préfixe des factures</Label>
              <Input
                id="prefix"
                value={invoiceSettings.prefix}
                onChange={(e) => setInvoiceSettings({...invoiceSettings, prefix: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextNumber">Prochain numéro de facture</Label>
              <Input
                id="nextNumber"
                type="number"
                value={invoiceSettings.nextNumber}
                onChange={(e) => setInvoiceSettings({...invoiceSettings, nextNumber: parseInt(e.target.value) || 1001})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDays">Délai de paiement (jours)</Label>
              <Input
                id="dueDays"
                type="number"
                value={invoiceSettings.dueDays}
                onChange={(e) => setInvoiceSettings({...invoiceSettings, dueDays: parseInt(e.target.value) || 30})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Taux de TVA par défaut (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={invoiceSettings.taxRate}
                onChange={(e) => setInvoiceSettings({...invoiceSettings, taxRate: parseInt(e.target.value) || 19})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </Button>
      </div>
    </div>
  );
}