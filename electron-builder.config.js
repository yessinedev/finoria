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
  win: {
    target: "nsis",
    icon: "public/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
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

    const projectRoot = packager.info.metadata.buildResources || process.cwd();
    // or just process.cwd()

    const standaloneDir = path.join(projectRoot, ".next", "standalone");
    const staticDir = path.join(projectRoot, ".next", "static");
    const publicDir = path.join(projectRoot, "public");

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