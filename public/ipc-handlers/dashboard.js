// Dashboard IPC handlers
module.exports = (ipcMain, db) => {
  ipcMain.handle("get-dashboard-stats", async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const todayRevenueStmt = db.prepare(`
        SELECT COALESCE(SUM(totalAmount + taxAmount), 0) as revenue 
        FROM sales 
        WHERE DATE(saleDate) = ?
      `);
      const todayRevenue = todayRevenueStmt.get(today);
      const totalClientsStmt = db.prepare(
        "SELECT COUNT(*) as count FROM clients"
      );
      const totalClients = totalClientsStmt.get();
      const totalProductsStmt = db.prepare(
        "SELECT COUNT(*) as count FROM products WHERE isActive = 1"
      );
      const totalProducts = totalProductsStmt.get();
      const recentSalesStmt = db.prepare(`
        SELECT s.id, c.name as client, (s.totalAmount + s.taxAmount) as amount, s.saleDate as date, s.status
        FROM sales s
        JOIN clients c ON s.clientId = c.id
        ORDER BY s.saleDate DESC
        LIMIT 10
      `);
      const recentSales = recentSalesStmt.all();
      return {
        todayRevenue: todayRevenue.revenue,
        totalClients: totalClients.count,
        totalProducts: totalProducts.count,
        recentSales,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      throw new Error("Erreur lors de la récupération des statistiques");
    }
  });
};
