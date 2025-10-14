"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, Save, User, Shield, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { db } from "@/lib/database";
import { CompanyData } from "@/types/types";

export default function SettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    invoiceReminders: true,
    lowStockAlerts: true,
    paymentNotifications: true,
  });

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [companyFields, setCompanyFields] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    city: "",
    country: "",
  });
  const [taxFields, setTaxFields] = useState({
    taxId: "",
    taxStatus: "",
    tvaNumber: "",
    tvaRate: "",
  });

  useEffect(() => {
  const fetchCompany = async () => {
    const res = await db.settings.get();

    // If your IPC returns { data: company }
    const c = res?.data;

    if (c) {
      setCompany(c);
      setCompanyFields({
        name: c.name || "",
        address: c.address || "",
        phone: c.phone || "",
        email: c.email || "",
        website: c.website || "",
        city: c.city || "",
        country: c.country || "",
      });
      setTaxFields({
        taxId: c.taxId || "",
        taxStatus: c.taxStatus || "",
        tvaNumber: c.tvaNumber ? String(c.tvaNumber) : "",
        tvaRate: c.tvaRate ? String(c.tvaRate) : "",
      });
    }
  };

  fetchCompany();
}, []);


  const handleSaveSettings = async () => {
    if (!company) return;
    // Only save if something changed
    const companyChanged = Object.keys(companyFields).some(
      (key) =>
        companyFields[key as keyof typeof companyFields] !==
        (company[key as keyof CompanyData] || "")
    );
    const taxChanged = Object.keys(taxFields).some(
      (key) =>
        taxFields[key as keyof typeof taxFields] !==
        (company[key as keyof CompanyData] || "")
    );
    if (!companyChanged && !taxChanged) return;

    setIsSubmitting(true);
    await db.settings.update(company.id, {
      ...companyFields,
      ...taxFields,
      tvaNumber:
        taxFields.tvaNumber !== "" ? parseInt(taxFields.tvaNumber) : null,
      tvaRate: taxFields.tvaRate !== "" ? parseInt(taxFields.tvaRate) : null,
    });
    console.log("Company Settings:", companyFields);
    console.log("Tax Settings:", taxFields);
    console.log("Notification Settings:", notifications);
    setIsSubmitting(false);
  };

  const updateNotification = (
    key: keyof typeof notifications,
    value: boolean
  ) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
              <p className="text-muted-foreground">
                Gérez les paramètres et préférences de votre entreprise
              </p>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isSubmitting}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? "Enregistrement..."
                : "Enregistrer les modifications"}
            </Button>
          </div>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Informations sur l'entreprise</CardTitle>
              </div>
              <CardDescription>
                Mettez à jour les informations de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Nom de l'entreprise"
                  id="name"
                  value={companyFields.name}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, name: value }))
                  }
                  placeholder="Entrez le nom de l'entreprise"
                  required
                  className="md:col-span-2"
                />
                <FormInput
                  label="Adresse de l'entreprise"
                  id="address"
                  value={companyFields.address}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, address: value }))
                  }
                  placeholder="123 rue des Affaires, Ville, État 12345"
                  className="md:col-span-2"
                />
                <FormInput
                  label="Numéro de téléphone"
                  id="phone"
                  value={companyFields.phone}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, phone: value }))
                  }
                  placeholder="+33 1 23 45 67 89"
                />
                <FormInput
                  label="Site web"
                  id="website"
                  value={companyFields.website}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, website: value }))
                  }
                  placeholder="https://votreentreprise.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Informations fiscales</CardTitle>
              </div>
              <CardDescription>
                Configurez vos paramètres fiscaux pour la conformité et les
                rapports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Numéro fiscal / EIN"
                  id="taxId"
                  value={taxFields.taxId}
                  onChange={(value) =>
                    setTaxFields((prev) => ({ ...prev, taxId: value }))
                  }
                  placeholder="12-3456789"
                  required
                />

                <div className="space-y-2">
                  <Label
                    htmlFor="taxStatus"
                    className="text-sm font-medium text-foreground"
                  >
                    Statut TVA <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Select
                    value={taxFields.taxStatus}
                    onValueChange={(value) =>
                      setTaxFields((prev) => ({ ...prev, taxStatus: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le statut TVA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assujetti">Assujetti</SelectItem>
                      <SelectItem value="exonéré">Exonéré</SelectItem>
                      <SelectItem value="non-assujetti">
                        Non assujetti
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {taxFields.taxStatus === "assujetti" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FormInput
                        label="Numéro de TVA"
                        type="text"
                        id="tvaNumber"
                        value={taxFields.tvaNumber?.toString() || ""}
                        onChange={(value) =>
                          setTaxFields((prev) => ({
                            ...prev,
                            tvaNumber: value,
                          }))
                        }
                        placeholder="12345687"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <FormInput
                        label="Taux de TVA"
                        type="number"
                        id="tvaRate"
                        value={taxFields.tvaRate?.toString() || ""}
                        onChange={(value) =>
                          setTaxFields((prev) => ({
                            ...prev,
                            tvaRate: value,
                          }))
                        }
                        placeholder="19"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Préférences de notification</CardTitle>
              </div>
              <CardDescription>
                Choisissez les notifications que vous souhaitez recevoir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">
                      Notifications par e-mail
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des notifications générales par e-mail
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      updateNotification("emailNotifications", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">
                      Rappels de factures
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des notifications concernant les factures en
                      retard
                    </p>
                  </div>
                  <Switch
                    checked={notifications.invoiceReminders}
                    onCheckedChange={(checked) =>
                      updateNotification("invoiceReminders", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">
                      Alertes de stock faible
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des alertes lorsque le stock est faible
                    </p>
                  </div>
                  <Switch
                    checked={notifications.lowStockAlerts}
                    onCheckedChange={(checked) =>
                      updateNotification("lowStockAlerts", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">
                      Notifications de paiement
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez une notification lors de la réception des
                      paiements
                    </p>
                  </div>
                  <Switch
                    checked={notifications.paymentNotifications}
                    onCheckedChange={(checked) =>
                      updateNotification("paymentNotifications", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={isSubmitting}
              size="lg"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? "Enregistrement des modifications..."
                : "Enregistrer toutes les modifications"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
