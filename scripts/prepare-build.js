const fs = require("fs-extra");
const path = require("path");

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");
const dbFile = path.join(projectRoot, "database.db");

// Electron output folder
const appDir = path.join(projectRoot, "dist", "win-unpacked", "resources", "app");

async function prepare() {
  console.log("🧹 Cleaning previous resources...");
  await fs.remove(appDir);

  console.log("📁 Creating resources/app directory...");
  await fs.ensureDir(appDir);

  // 1. Copy Next standalone build
  console.log("📦 Copying Next standalone build...");
  await fs.copy(standaloneDir, appDir, { dereference: true });

  // 2. Copy Next static files
  console.log("🌐 Copying static assets...");
  await fs.copy(staticDir, path.join(appDir, ".next", "static"), { dereference: true });

  // 3. Copy public files
  console.log("🖼️ Copying public folder...");
  await fs.copy(publicDir, path.join(appDir, "public"), { dereference: true });

  // 4. Copy database if exists
  if (fs.existsSync(dbFile)) {
    console.log("🗃️ Copying database file...");
    await fs.copy(dbFile, path.join(appDir, "database.db"));
  }

  console.log("✅ All app resources copied successfully to dist/win-unpacked/resources/app/");
}

prepare().catch((err) => {
  console.error("❌ Error preparing build:", err);
  process.exit(1);
});
