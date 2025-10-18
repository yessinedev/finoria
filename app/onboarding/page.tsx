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
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormStep } from "@/components/onboarding/form-step";
import { Stepper } from "@/components/onboarding/stepper";
import { useOnboarding } from "@/hooks/use-onboarding";
import { db } from "@/lib/database";

export default function OnboardingPage() {
  const router = useRouter();
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

  const handleNext = async () => {
    if (isLastStep) {
      console.log(data)
      const settings = await db.settings.create({...data.companyInfo, ...data.taxInfo});
      if(settings.success) {
        router.push("/dashboard");
      }else{
        alert("Failed to create company. Please try again.");
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
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Nom de l'entreprise"
                id="companyName"
                value={data.companyInfo.name}
                onChange={(value) => updateCompanyInfo({ name: value })}
                placeholder="Acme Corporation"
                required
              />
              <FormInput
                label="Adresse de l'entreprise"
                id="address"
                value={data.companyInfo.address}
                onChange={(value) => updateCompanyInfo({ address: value })}
                placeholder="123 rue des Affaires, Ville, État 12345"
                required
              />
              <FormInput
                label="Téléphone de l'entreprise"
                id="phone"
                value={data.companyInfo.phone}
                onChange={(value) => updateCompanyInfo({ phone: value })}
                placeholder="01 23 45 67 89"
                required
              />
              <FormInput
                label="Email de l'entreprise"
                id="email"
                value={data.companyInfo.email}
                onChange={(value) => updateCompanyInfo({ email: value })}
                placeholder="contact@acme.com"
                required
              />
              <FormInput
                label="Site web de l'entreprise"
                id="website"
                value={data.companyInfo.website || ""}
                onChange={(value) => updateCompanyInfo({ website: value })}
                placeholder="https://www.acme.com"
                required
              />
              <FormInput
                label="Ville de l'entreprise"
                id="city"
                value={data.companyInfo.city}
                onChange={(value) => updateCompanyInfo({ city: value })}
                placeholder="Ville"
                required
              />
              <FormInput
                label="Pays de l'entreprise"
                id="country"
                value={data.companyInfo.country}
                onChange={(value) => updateCompanyInfo({ country: value })}
                placeholder="Pays"
                required
              />
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
                  <div className="space-y-2">
                    <FormInput
                      label="Taux de TVA"
                      type="number"
                      id="tvaRate"
                      value={data.taxInfo.tvaRate?.toString() || ""}
                      onChange={(value) =>
                        updateTaxInfo({ tvaRate: Number(value) })
                      }
                      placeholder="19"
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
