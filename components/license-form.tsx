"use client";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Key, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormInput } from "./ui/form-input";
import { db } from "@/lib/database";
import { verifyLicense } from "@/lib/license";
import { useRouter } from "next/navigation";

interface LicenseFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function LicenseForm({ onSuccess, className }: LicenseFormProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error" | "offline">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await db.device.getFingerprint();
      const fingerprint = result.data;
      
      try {
        const verified = await verifyLicense(licenseKey, fingerprint);

        if (verified) {
          // Mark as activated for offline use
          localStorage.setItem("licenseKey", licenseKey);
          localStorage.setItem("licenseActivated", "true");
          localStorage.setItem("licenseFingerprint", fingerprint);
          setStatus("success");
          setTimeout(() => onSuccess?.(), 1000);
          return;
        }
      } catch (verifyErr) {
        // If verification throws offline error, try activation
        if (verifyErr instanceof Error && verifyErr.message === "OFFLINE") {
          setStatus("offline");
          setErrorMessage("Vous devez être connecté à Internet pour activer votre licence pour la première fois.");
          setIsLoading(false);
          return;
        }
      }
      
      const res = await fetch("https://license.etudionet.life/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey,
          fingerprint,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === "activated") {
        setStatus("success");
        // Mark as activated for offline use
        window.localStorage.setItem("licenseKey", licenseKey);
        window.localStorage.setItem("licenseActivated", "true");
        window.localStorage.setItem("licenseFingerprint", fingerprint);
        setTimeout(() => onSuccess?.(), 1000);
      } else {
        setStatus("error");
        setErrorMessage("Clé de licence invalide");
      }
    } catch (err) {
      console.error(err);
      setStatus("offline");
      setErrorMessage("Impossible de se connecter au serveur de licence. Vérifiez votre connexion Internet.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setLicenseKey("");
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Key className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Activez votre licence</CardTitle>
        <CardDescription>
          Entrez votre clé de licence pour commencer avec BusinessApp
        </CardDescription>
      </CardHeader>

      <CardContent>
        {status === "success" ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Licence activée !
              </h3>
              <p className="text-muted-foreground">
                Redirection vers l'onboarding...
              </p>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Clé de licence invalide
                </h3>
                <p className="text-sm text-muted-foreground">
                  {errorMessage || "Veuillez vérifier votre clé de licence et réessayer"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Clé de licence"
                id="licenseKey"
                value={licenseKey}
                onChange={setLicenseKey}
                placeholder="Entrez votre clé de licence"
                required
                error={
                  status === "error" ? errorMessage || "Clé de licence invalide" : undefined
                }
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 bg-transparent"
                >
                  Effacer
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Validation..." : "Activer"}
                </Button>
              </div>
            </form>
          </div>
        ) : status === "offline" ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <WifiOff className="h-12 w-12 text-orange-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Connexion Internet requise
                </h3>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Clé de licence"
                id="licenseKey"
                value={licenseKey}
                onChange={setLicenseKey}
                placeholder="Entrez votre clé de licence"
                required
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 bg-transparent"
                >
                  Effacer
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Validation..." : "Réessayer"}
                </Button>
              </div>
            </form>

            <div className="text-xs text-muted-foreground text-center bg-muted p-3 rounded-md">
              💡 Astuce: Une fois la licence activée avec une connexion Internet, 
              vous pourrez utiliser l'application hors ligne.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Clé de licence"
              id="licenseKey"
              value={licenseKey}
              onChange={setLicenseKey}
              placeholder="ABC-123-XYZ"
              required
            />

            <Button
              type="submit"
              disabled={isLoading || !licenseKey.trim()}
              className="w-full"
            >
              {isLoading ? "Validation..." : "Activer la licence"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Vous n'avez pas de clé de licence ? Contactez notre équipe
              commerciale
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
