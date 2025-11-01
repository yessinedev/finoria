'use client'
import { FormInput } from "@/components/ui/form-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormStep } from "@/components/onboarding/form-step";
import { Stepper } from "@/components/onboarding/stepper";
import { useOnboarding } from "@/hooks/use-onboarding";
import { db } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    currentStep,
    steps,
    data,
    updateCompanyInfo,
    updateTaxInfo,
    nextStep,
    prevStep,
    isFirstStep,
    isLastStep,
  } = useOnboarding();

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
      updateCompanyInfo({ logo: imageData });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    updateCompanyInfo({ logo: "" });
  };

  const handleNext = async () => {
    if (isLastStep) {
      const settings = await db.settings.create({...data.companyInfo, ...data.taxInfo});
      if(settings.success) {
        toast({
          title: "Succès",
          description: "Configuration de l'entreprise terminée avec succès",
        });
        router.push("/dashboard");
      }else{
        toast({
          title: "Erreur",
          description: "Échec de la création de l'entreprise. Veuillez réessayer.",
          variant: "destructive",
        });
      }

    } else {
      nextStep();
    }
  };

  const canProceedFromStep = () => {
    switch (currentStep) {
      case 0: // Company Info
        return !!data.companyInfo;
      case 1: // Tax Info
        return !!data.taxInfo;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <FormStep
            title="Informations sur l'entreprise"
            description="Parlez-nous de votre entreprise pour commencer"
            onNext={handleNext}
            onPrev={prevStep}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            canProceed={canProceedFromStep()}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Nom de l'entreprise"
                  id="companyName"
                  value={data.companyInfo.name}
                  onChange={(value) => updateCompanyInfo({ name: value })}
                  placeholder="Société Exemple SARL"
                  required
                />
                <FormInput
                  label="Adresse de l'entreprise"
                  id="address"
                  value={data.companyInfo.address}
                  onChange={(value) => updateCompanyInfo({ address: value })}
                  placeholder="Avenue Habib Bourguiba, Tunis 1000"
                  required
                />
                <FormInput
                  label="Téléphone de l'entreprise"
                  id="phone"
                  value={data.companyInfo.phone}
                  onChange={(value) => updateCompanyInfo({ phone: value })}
                  placeholder="+216 71 234 567"
                  required
                />
                <FormInput
                  label="Email de l'entreprise"
                  id="email"
                  value={data.companyInfo.email}
                  onChange={(value) => updateCompanyInfo({ email: value })}
                  placeholder="contact@exemple.tn"
                  required
                />
                <FormInput
                  label="Site web de l'entreprise"
                  id="website"
                  value={data.companyInfo.website || ""}
                  onChange={(value) => updateCompanyInfo({ website: value })}
                  placeholder="https://www.exemple.tn"
                  required
                />
                <FormInput
                  label="Ville de l'entreprise"
                  id="city"
                  value={data.companyInfo.city}
                  onChange={(value) => updateCompanyInfo({ city: value })}
                  placeholder="Tunis"
                  required
                />
                <FormInput
                  label="Pays de l'entreprise"
                  id="country"
                  value={data.companyInfo.country}
                  onChange={(value) => updateCompanyInfo({ country: value })}
                  placeholder="Tunisie"
                  required
                />
              </div>

              {/* Logo Upload Section */}
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
                  {data.companyInfo.logo && (
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

              {data.companyInfo.logo && (
                <div className="flex items-center justify-center">
                  <div className="border rounded-lg p-2 bg-muted">
                    <img 
                      src={data.companyInfo.logo} 
                      alt="Company Logo" 
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </FormStep>
        );

      case 1:
        return (
          <FormStep
            title="Informations fiscales"
            description="Configurez vos paramètres fiscaux pour la conformité"
            onNext={handleNext}
            onPrev={prevStep}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            canProceed={canProceedFromStep()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Numéro fiscal"
                id="taxId"
                value={data.taxInfo.taxId}
                onChange={(value) => updateTaxInfo({ taxId: value })}
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
                  value={data.taxInfo.taxStatus}
                  onValueChange={(value) => updateTaxInfo({ taxStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le statut TVA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assujetti">Assujetti</SelectItem>
                    <SelectItem value="exonéré">Exonéré</SelectItem>
                    <SelectItem value="non-assujetti">Non assujetti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {data.taxInfo.taxStatus === "assujetti" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormInput
                      label="Numéro de TVA"
                      type="text"
                      id="tvaNumber"
                      value={data.taxInfo.tvaNumber?.toString() || ""}
                      onChange={(value) =>
                        updateTaxInfo({ tvaNumber: Number(value) })
                      }
                      placeholder="12345687"
                      required
                    />
                  </div>

                </div>
              )}
            </div>
          </FormStep>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-foreground">
              Finoria
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenue sur Finoria
          </h1>
          <p className="text-muted-foreground">
            Configurons votre entreprise en quelques étapes seulement
          </p>
        </div>

        <div className="mb-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {renderStepContent()}
      </div>
    </div>
  );
}
