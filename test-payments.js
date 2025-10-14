try {
  const paymentsHandlers = require("./public/ipc-handlers/payments");
  console.log("Payments handlers module loaded successfully");
  console.log("Module type:", typeof paymentsHandlers);
  console.log("Module keys:", Object.keys(paymentsHandlers || {}));
} catch (error) {
  console.error("Error loading payments handlers module:", error);
}