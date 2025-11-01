const path = require("path");
const fs = require("fs-extra");

module.exports = {
  appId: "com.finoria.app",
  productName: "Finoria",
  directories: {
    output: "dist",
  },
  asar: true,
  asarUnpack: ["**/*.node"],
  files: ["main/**/*"],
  // Only build for Windows since that's your target platform
  win: {
    target: "nsis",
    icon: "public/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    // Preserve user data during updates
    differentialPackage: true,
    // Don't delete user data
    deleteAppDataOnUninstall: false
  },
  // Disable Linux and macOS builds
  linux: {
    target: []
  },
  mac: {
    target: []
  },
  // GitHub publish configuration
  publish: [
    {
      provider: "generic",
      url: "https://updates-finoria.etudionet.life" 
    }
  ],

  // Hook executed after packaging but before installer is built
  afterPack: async (context) => {
    const { appOutDir, packager } = context;
    // appOutDir is the folder where resources are stored (like .../win-unpacked/resources)
    const resourcesPath = path.join(appOutDir, "resources");
    const targetAppFolder = path.join(resourcesPath, "app");

    // Use process.cwd() directly to get the project root
    const projectRoot = process.cwd();
    const standaloneDir = path.join(projectRoot, ".next", "standalone");
    const staticDir = path.join(projectRoot, ".next", "static");
    const publicDir = path.join(projectRoot, "public");

    // Verify standalone directory exists
    if (!await fs.pathExists(standaloneDir)) {
      throw new Error(
        `Standalone directory not found: ${standaloneDir}\n` +
        `Make sure to run 'npm run build:next' before building the Electron app.`
      );
    }

    // Remove old if exists
    await fs.remove(targetAppFolder);
    // Copy standalone build (including node_modules) into resources/app
    await fs.copy(standaloneDir, targetAppFolder, { dereference: true });
    // Copy static
    await fs.copy(staticDir, path.join(targetAppFolder, ".next", "static"), {
      dereference: true,
    });
    // Copy public
    await fs.copy(publicDir, path.join(targetAppFolder, "public"), {
      dereference: true,
    });

    console.log(
      "✅ afterPack: injected resources/app folder into built package"
    );
  },
};