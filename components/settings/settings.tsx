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
import { Building2, Save, Shield, Download, Upload, RefreshCw, CheckCircle } from "lucide-react";
import { db } from "@/lib/database";
import { CompanyData } from "@/types/types";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean;
    version?: string;
    url?: string;
  } | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

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
      console.log("Raw response from db.settings.get():", res);

      // If your IPC returns { data: company }
      const c = res?.data;
      console.log("company: ", res);
      if (c) {
        console.log("Company data received:", c);
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
          tvaNumber:
            c.tvaNumber !== null && c.tvaNumber !== undefined
              ? String(c.tvaNumber)
              : "",
          tvaRate:
            c.tvaRate !== null && c.tvaRate !== undefined
              ? String(c.tvaRate)
              : "",
        });
      } else {
        console.log("No company data received");
      }
    };

    fetchCompany();
  }, []);

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await db.device.checkForUpdates();
      if (result.success && result.data) {
        setUpdateInfo({
          available: result.data.data?.available || false,
          version: result.data.data?.version,
          url: result.data.data?.url
        });
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const downloadUpdate = async () => {
    if (!updateInfo?.available) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      const result = await db.device.downloadUpdate();
      if (!result.success) {
        console.error("Error downloading update:", result.error);
        setIsDownloading(false);
      }
    } catch (error) {
      console.error("Error downloading update:", error);
      setIsDownloading(false);
    }
  };

  const installUpdate = async () => {
    try {
      await db.device.quitAndInstall();
    } catch (error) {
      console.error("Error installing update:", error);
    }
  };

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

    // Prepare the data for update
    const updateData = {
      ...companyFields,
      taxId: taxFields.taxId,
      taxStatus: taxFields.taxStatus,
      tvaNumber:
        taxFields.tvaNumber !== ""
          ? parseInt(taxFields.tvaNumber) || null
          : null,
      tvaRate:
        taxFields.tvaRate !== "" ? parseInt(taxFields.tvaRate) || null : null,
    };

    console.log("Updating company with data:", updateData);

    const result = await db.settings.update(company.id, updateData);
    console.log("Update result:", result);

    if (result.success) {
      toast({
        title: "Succès",
        description: "Paramètres enregistrés avec succès",
      });
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Erreur lors de l'enregistrement des paramètres",
        variant: "destructive",
      });
    }

    console.log("Company Settings:", companyFields);
    console.log("Tax Settings:", taxFields);
    setIsSubmitting(false);
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const result = await db.database.export();
      if (result.success && result.data) {
        if (result.data.success) {
          console.log(`Database exported successfully: ${result.data.filename}`);
          toast({
            title: "Succès",
            description: `Base de données exportée avec succès: ${result.data.filename}`,
          });
        } else {
          console.error("Error exporting database:", result.data.error || "Unknown error");
          toast({
            title: "Erreur",
            description: result.data.error || "Erreur lors de l'export de la base de données",
            variant: "destructive",
          });
        }
      } else {
        console.error("Error exporting database:", result.error || "Unknown error");
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'export de la base de données",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unexpected error exporting database:", error);
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de l'export de la base de données",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async () => {
    setIsImporting(true);
    try {
      // Call the import function (opens file dialog)
      const result = await db.database.import();
      if (result.success && result.data) {
        if (result.data.success) {
          console.log(result.data.message || "Database imported successfully");
          toast({
            title: "Succès",
            description: result.data.message || "Base de données importée avec succès",
          });
          // Reload the page to reflect the new data
          window.location.reload();
        } else {
          console.error("Error importing database:", result.data.error || "Unknown error");
          toast({
            title: "Erreur",
            description: result.data.error || "Erreur lors de l'import de la base de données",
            variant: "destructive",
          });
        }
      } else {
        console.error("Error importing database:", result.error || "Unknown error");
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'import de la base de données",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unexpected error importing database:", error);
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de l'import de la base de données",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    // Set up update event listeners
    if (window.electronAPI?.onUpdateAvailable) {
      window.electronAPI.onUpdateAvailable((info) => {
        setUpdateInfo({
          available: true,
          version: info.version,
          url: info.url
        });
      });
    }

    if (window.electronAPI?.onUpdateNotAvailable) {
      window.electronAPI.onUpdateNotAvailable(() => {
        console.log("No updates available");
      });
    }

    if (window.electronAPI?.onUpdateError) {
      window.electronAPI.onUpdateError((error) => {
        console.error("Update error:", error);
        setIsCheckingUpdate(false);
        setIsDownloading(false);
      });
    }

    if (window.electronAPI?.onUpdateDownloadProgress) {
      window.electronAPI.onUpdateDownloadProgress((progress) => {
        setDownloadProgress(progress.percent);
      });
    }

    if (window.electronAPI?.onUpdateDownloaded) {
      window.electronAPI.onUpdateDownloaded((info) => {
        setUpdateDownloaded(true);
        setIsDownloading(false);
        setDownloadProgress(0);
        console.log(`Update downloaded: ${info.version}`);
      });
    }

    // No cleanup needed as the listeners are managed by the preload script
  }, []);

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
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleImportDatabase}
              disabled={isImporting}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isImporting ? "Import en cours..." : "Importer base de données"}
            </Button>
            <Button
              onClick={handleExportDatabase}
              disabled={isExporting}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Export en cours..." : "Exporter base de données"}
            </Button>
            <Button
              onClick={checkForUpdates}
              disabled={isCheckingUpdate || isDownloading}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isCheckingUpdate ? "animate-spin" : ""}`}
              />
              {isCheckingUpdate
                ? "Vérification..."
                : "Vérifier les mises à jour"}
            </Button>
            {updateInfo?.available && !updateDownloaded && (
              <Button
                onClick={downloadUpdate}
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Téléchargement... {Math.round(downloadProgress)}%
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Télécharger la mise à jour ({updateInfo.version})
                  </>
                )}
              </Button>
            )}
            {updateDownloaded && (
              <Button onClick={installUpdate} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Installer la mise à jour ({updateInfo?.version})
              </Button>
            )}
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
            </CardContent>
          </Card>

          {/* Save Button */}
        </div>
      </main>
    </div>
  );
}
