"use client";

import { LicenseForm } from "@/components/license-form";
import { db } from "@/lib/database";
import { verifyLicense } from "@/lib/license";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LicensePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const handleSuccess = () => {
    router.push("/onboarding");
  };

  useEffect(() => {
    (async () => {
      const fingerprint = await db.device.getFingerprint();
      const licenseKey = localStorage.getItem("licenseKey");
      const valid = await verifyLicense(licenseKey, fingerprint.data);
      if (valid) {
        router.push("/dashboard");
      } else {
        setChecking(false); // show form
      }
    })();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Vérification de la licence...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-foreground">
              Finoria
            </span>
          </div>
          <p className="text-muted-foreground">
            Bienvenue dans votre solution de gestion d&apos;entreprise
          </p>
        </div>

        <LicenseForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
