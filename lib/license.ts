
export async function verifyLicense(licenseKey: string, fingerprint: string) {
  try {
    const res = await fetch("https://license.etudionet.life/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, fingerprint }),
    });

    const data = await res.json();
    return res.ok && data.valid === true;
  } catch (err) {
    console.error("License verification failed:", err);
    throw new Error("OFFLINE"); // Throw specific error for offline detection
  }
}

// Check if license is activated locally (offline check)
export function isLicenseActivated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const licenseKey = localStorage.getItem("licenseKey");
  const isActivated = localStorage.getItem("licenseActivated");
  const activatedFingerprint = localStorage.getItem("licenseFingerprint");
  
  return !!(licenseKey && isActivated === "true" && activatedFingerprint);
}

// Verify license with offline fallback
export async function verifyLicenseWithOffline(
  licenseKey: string | null, 
  fingerprint: string
): Promise<{ valid: boolean; offline?: boolean; error?: string }> {
  if (!licenseKey) {
    return { valid: false };
  }
  
  // Check if already activated locally
  const locallyActivated = isLicenseActivated();
  const storedFingerprint = localStorage.getItem("licenseFingerprint");
  
  // If activated and fingerprint matches, allow offline access
  if (locallyActivated && storedFingerprint === fingerprint) {
    console.log("License verified offline");
    
    // Try to verify online in background (don't block on failure)
    try {
      const onlineValid = await verifyLicense(licenseKey, fingerprint);
      if (!onlineValid) {
        console.warn("Online verification failed, but offline license is valid");
      }
      return { valid: true, offline: false };
    } catch (err) {
      console.log("Offline mode: Could not verify online, using cached license");
      return { valid: true, offline: true };
    }
  }
  
  // Not activated locally, must verify online
  try {
    const valid = await verifyLicense(licenseKey, fingerprint);
    if (valid) {
      // Mark as activated for offline use
      localStorage.setItem("licenseActivated", "true");
      localStorage.setItem("licenseFingerprint", fingerprint);
      return { valid: true, offline: false };
    }
    return { valid: false };
  } catch (err) {
    console.error("Online verification required but failed:", err);
    // Check if error is due to offline
    if (err instanceof Error && err.message === "OFFLINE") {
      return { 
        valid: false, 
        offline: true,
        error: "Vous devez être connecté à Internet pour activer votre licence pour la première fois."
      };
    }
    return { valid: false };
  }
}
