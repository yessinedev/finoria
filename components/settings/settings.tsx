"use client"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Save, Shield, Download, Upload, RefreshCw, CheckCircle, Percent, Image as ImageIcon } from "lucide-react";
import { db } from "@/lib/database";
import { CompanyData } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import VatManagement from "./VatManagement";

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
    logo: "",
  });
  const [taxFields, setTaxFields] = useState({
    taxId: "",
    taxStatus: "",
    tvaNumber: "",
    timbreFiscal: 1.000,
    fodecRate: 1.0,
  });

  useEffect(() => {
    const fetchCompany = async () => {
      const res = await db.settings.get();

      // If your IPC returns { data: company }
      const c = res?.data;
      if (c && c.id) {
        setCompany(c);
        setCompanyFields({
          name: c.name || "",
          address: c.address || "",
          phone: c.phone || "",
          email: c.email || "",
          website: c.website || "",
          city: c.city || "",
          country: c.country || "",
          logo: c.logo || "",
        });
        setTaxFields({
          taxId: c.taxId || "",
          taxStatus: c.taxStatus || "",
          tvaNumber:
            c.tvaNumber !== null && c.tvaNumber !== undefined
              ? String(c.tvaNumber)
              : "",
          timbreFiscal: c.timbreFiscal !== undefined ? c.timbreFiscal : 1.000,
          fodecRate: c.fodecRate !== undefined ? c.fodecRate : 1.0,
        });
      } else {
        // Initialize with empty company data
        setCompany(null);
        setCompanyFields({
          name: "",
          address: "",
          phone: "",
          email: "",
          website: "",
          city: "",
          country: "",
          logo: "",
        });
        setTaxFields({
          taxId: "",
          taxStatus: "",
          tvaNumber: "",
          timbreFiscal: 1.000,
          fodecRate: 1.0,
        });
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
    // Don't return early if there's no company - we should create one in that case
    // Only save if something changed
    let companyChanged = false;
    let taxChanged = false;
    
    if (company) {
      // Check if company fields changed
      companyChanged = Object.keys(companyFields).some(
        (key) =>
          companyFields[key as keyof typeof companyFields] !==
          (company[key as keyof CompanyData] ?? "")
      );
      
      // Check if tax fields changed (using correct field mapping)
      taxChanged = Object.keys(taxFields).some(
        (key) => {
          // Special handling for tvaNumber since it's stored as a number in company but string in taxFields
          if (key === 'tvaNumber') {
            const companyValue = company.tvaNumber !== null && company.tvaNumber !== undefined 
              ? String(company.tvaNumber) 
              : "";
            return taxFields.tvaNumber !== companyValue;
          }
          // Special handling for timbreFiscal
          if (key === 'timbreFiscal') {
            const companyValue = company.timbreFiscal !== undefined ? company.timbreFiscal : 1.000;
            return taxFields.timbreFiscal !== companyValue;
          }
          // Special handling for fodecRate
          if (key === 'fodecRate') {
            const companyValue = company.fodecRate !== undefined ? company.fodecRate : 1.0;
            return taxFields.fodecRate !== companyValue;
          }
          return taxFields[key as keyof typeof taxFields] !==
            (company[key as keyof CompanyData] ?? "");
        }
      );
    } else {
      // If there's no company, we should create one
      companyChanged = true;
    }
    
    if (!companyChanged && !taxChanged) return;

    setIsSubmitting(true);

    // Prepare the data for update/create
    const updateData = {
      ...companyFields,
      taxId: taxFields.taxId,
      taxStatus: taxFields.taxStatus,
      tvaNumber:
        taxFields.tvaNumber !== ""
          ? parseInt(taxFields.tvaNumber) || null
          : null,
      timbreFiscal: taxFields.timbreFiscal,
      fodecRate: taxFields.fodecRate,
    };


    let result;
    if (company && company.id) {
      // Update existing company
      result = await db.settings.update(company.id, updateData);
    } else {
      // Create new company
      result = await db.settings.create(updateData);
    }
    
    if (result.success) {
      // Update local state with the new/updated company data
      if (result.data) {
        setCompany(result.data);
        // Update form fields to match saved data
        setCompanyFields({
          name: result.data.name || "",
          address: result.data.address || "",
          phone: result.data.phone || "",
          email: result.data.email || "",
          website: result.data.website || "",
          city: result.data.city || "",
          country: result.data.country || "",
          logo: result.data.logo || "",
        });
        setTaxFields({
          taxId: result.data.taxId || "",
          taxStatus: result.data.taxStatus || "",
          tvaNumber:
            result.data.tvaNumber !== null && result.data.tvaNumber !== undefined
              ? String(result.data.tvaNumber)
              : "",
          timbreFiscal: result.data.timbreFiscal !== undefined ? result.data.timbreFiscal : 1.000,
          fodecRate: result.data.fodecRate !== undefined ? result.data.fodecRate : 1.0,
        });
      }
      
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

    setIsSubmitting(false);
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const result = await db.database.export();
      if (result.success && result.data) {
        if (result.data.success) {
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
      const result = await db.database.import();
      if (result.success && result.data) {
        if (result.data.success) {
          const dataWithRestart = result.data as typeof result.data & {
            restartRequired?: boolean;
          };
          const restartRequired = !!dataWithRestart.restartRequired;
          const restartMessage = restartRequired
            ? " L'application va redémarrer automatiquement."
            : "";

          toast({
            title: "Succès",
            description: `${result.data.message || "Base de données importée avec succès"}${restartMessage}`,
          });
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image valide",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "La taille de l'image ne doit pas dépasser 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCompanyFields(prev => ({ ...prev, logo: imageData }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setCompanyFields(prev => ({ ...prev, logo: "" }));
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
        toast({
          title: "Aucune mise à jour disponible",
          description: "Votre application est à jour",
        });
      });
    }

    if (window.electronAPI?.onUpdateError) {
      window.electronAPI.onUpdateError((error) => {
        toast({
          title: "Erreur de mise à jour",
          description: error || "Une erreur inattendue s'est produite durant la vérification des mises à jour",
          variant: "destructive",
        });
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
        toast({
          title: "Mise à jour téléchargée",
          description: `Mise à jour téléchargée: ${info.version}`,
        });
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
          </div>

          {/* Tabs for Settings */}
          <Tabs defaultValue="company" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Entreprise
              </TabsTrigger>
              <TabsTrigger value="tax" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Fiscal
              </TabsTrigger>
              <TabsTrigger value="taxes" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Taux de TVA
              </TabsTrigger>
            </TabsList>

            {/* Company Tab */}
            <TabsContent value="company" className="space-y-6">
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
                  placeholder="Avenue Habib Bourguiba, Tunis 1000"
                  className="md:col-span-2"
                />
                <FormInput
                  label="Ville"
                  id="city"
                  value={companyFields.city}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, city: value }))
                  }
                  placeholder="Tunis"
                />
                <FormInput
                  label="Pays"
                  id="country"
                  value={companyFields.country}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, country: value }))
                  }
                  placeholder="Tunisie"
                />
                <FormInput
                  label="Numéro de téléphone"
                  id="phone"
                  value={companyFields.phone}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, phone: value }))
                  }
                  placeholder="+216 71 234 567"
                />
                <FormInput
                  label="Site web"
                  id="website"
                  value={companyFields.website}
                  onChange={(value) =>
                    setCompanyFields((prev) => ({ ...prev, website: value }))
                  }
                  placeholder="https://votreentreprise.tn"
                />
              </div>
              
              {/* Logo Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Logo de l'entreprise
                  </Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Choisir un logo
                    </label>
                    {companyFields.logo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={removeLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés: JPG, PNG, GIF. Taille maximale: 2MB
                  </p>
                </div>
                
                {companyFields.logo && (
                  <div className="flex items-center justify-center">
                    <div className="border rounded-lg p-2 bg-muted">
                      <img 
                        src={companyFields.logo} 
                        alt="Company Logo" 
                        className="max-h-24 max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSubmitting}
                    size="lg"
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting
                      ? "Enregistrement..."
                      : "Enregistrer les modifications"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </TabsContent>

            {/* Tax Tab */}
            <TabsContent value="tax" className="space-y-6">
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
                
                {/* Timbre Fiscal Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="timbreFiscal"
                    className="text-sm font-medium text-foreground"
                  >
                    Timbre Fiscal (DNT)
                  </Label>
                  <div className="relative">
                    <input
                      type="number"
                      id="timbreFiscal"
                      value={taxFields.timbreFiscal}
                      onChange={(e) =>
                        setTaxFields((prev) => ({
                          ...prev,
                          timbreFiscal: parseFloat(e.target.value) || 0,
                        }))
                      }
                      step="0.001"
                      min="0"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="1.000"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-muted-foreground text-sm">DNT</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Montant du timbre fiscal à appliquer sur chaque facture
                  </p>
                </div>

                {/* FODEC Rate Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="fodecRate"
                    className="text-sm font-medium text-foreground"
                  >
                    Taux FODEC (%)
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      id="fodecRate"
                      value={taxFields.fodecRate}
                      onChange={(e) =>
                        setTaxFields((prev) => ({
                          ...prev,
                          fodecRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                      step="0.1"
                      min="0"
                      max="100"
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="1.0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Taux FODEC à appliquer sur les produits éligibles
                  </p>
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
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSubmitting}
                  size="lg"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
                </Button>
              </div>
            </CardContent>
          </Card>
            </TabsContent>

            {/* Taxes Tab */}
            <TabsContent value="taxes" className="space-y-6">
              <VatManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}