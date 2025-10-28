
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
    return false;
  }
}
