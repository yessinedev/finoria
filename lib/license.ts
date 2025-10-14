import { db } from "./database";

export async function verifyLicense() {
  const licenseKey = localStorage.getItem("licenseKey");
  if (!licenseKey) return false;

  // Ask preload script for machine fingerprint
  if (!db.device?.getFingerprint) return false;
  const fingerprint = await db.device.getFingerprint();

  try {
    const res = await fetch("https://your-server.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, fingerprint }),
    });

    const data = await res.json();
    return res.ok && data.valid === true;
  } catch (err) {
    console.error("License verification failed:", err);
    return false;
  }
}
