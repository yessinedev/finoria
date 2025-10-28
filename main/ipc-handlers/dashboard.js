// Dashboard IPC handlers
module.exports = (ipcMain, db) => {
  ipcMain.handle("get-dashboard-stats", async (event, dateRange) => {
    try {
      // Set default date range to 30 days if not provided
      const range = dateRange || "30";
      
      let startDate, endDate;
      const today = new Date();
      
      switch(range) {
        case "7":
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
          break;
        case "30":
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
          break;
        case "90":
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
          break;
        case "365":
          startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      }
      
      endDate = today;
      
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      
      // Today's revenue
      const todayRevenueStmt = db.prepare(`
        SELECT COALESCE(SUM(totalAmount + taxAmount), 0) as revenue 
        FROM sales 
        WHERE DATE(saleDate) = DATE('now')
      `);
      const todayRevenue = todayRevenueStmt.get();
      
      // Monthly revenue (current month)
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const monthlyRevenueStmt = db.prepare(`
        SELECT COALESCE(SUM(totalAmount + taxAmount), 0) as revenue 
        FROM sales 
        WHERE DATE(saleDate) BETWEEN ? AND ?
      `);
      const monthlyRevenue = monthlyRevenueStmt.get(firstDayOfMonth, lastDayOfMonth);
      
      // Total clients
      const totalClientsStmt = db.prepare(
        "SELECT COUNT(*) as count FROM clients"
      );
      const totalClients = totalClientsStmt.get();
      
      // Total products
      const totalProductsStmt = db.prepare(
        "SELECT COUNT(*) as count FROM products WHERE isActive = 1"
      );
      const totalProducts = totalProductsStmt.get();
      
      // Low stock products (stock <= 5)
      const lowStockProductsStmt = db.prepare(
        "SELECT COUNT(*) as count FROM products WHERE isActive = 1 AND stock <= 5"
      );
      const lowStockProducts = lowStockProductsStmt.get();
      
      // Total sales (within date range)
      const totalSalesStmt = db.prepare(`
        SELECT COUNT(*) as count FROM sales 
        WHERE DATE(saleDate) BETWEEN ? AND ?
      `);
      const totalSales = totalSalesStmt.get(startDateStr, endDateStr);
      
      // Pending invoices
      const pendingInvoicesStmt = db.prepare(
        "SELECT COUNT(*) as count FROM invoices WHERE status = 'En attente'"
      );
      const pendingInvoices = pendingInvoicesStmt.get();
      
      // Overdue invoices (due date < today and not paid)
      const overdueInvoicesStmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM invoices 
        WHERE status = 'En attente' AND DATE(dueDate) < DATE('now')
      `);
      const overdueInvoices = overdueInvoicesStmt.get();
      
      // Recent sales (last 10, within date range)
      const recentSalesStmt = db.prepare(`
        SELECT s.id, c.name as client, (s.totalAmount + s.taxAmount) as amount, s.saleDate as date, s.status
        FROM sales s
        JOIN clients c ON s.clientId = c.id
        WHERE DATE(s.saleDate) BETWEEN ? AND ?
        ORDER BY s.saleDate DESC
        LIMIT 10
      `);
      const recentSales = recentSalesStmt.all(startDateStr, endDateStr);
      
      // Sales by month for the selected date range
      let salesByMonthQuery;
      if (range === "7") {
        // For 7 days, group by day
        salesByMonthQuery = `
          SELECT 
            strftime('%d/%m', saleDate) as month,
            SUM(totalAmount + taxAmount) as revenue,
            COUNT(*) as sales
          FROM sales 
          WHERE DATE(saleDate) BETWEEN ? AND ?
          GROUP BY strftime('%Y-%m-%d', saleDate)
          ORDER BY saleDate
        `;
      } else {
        // For longer periods, group by month
        salesByMonthQuery = `
          SELECT 
            strftime('%m/%Y', saleDate) as month,
            SUM(totalAmount + taxAmount) as revenue,
            COUNT(*) as sales
          FROM sales 
          WHERE DATE(saleDate) BETWEEN ? AND ?
          GROUP BY strftime('%Y-%m', saleDate)
          ORDER BY saleDate
        `;
      }
      
      const salesByMonthStmt = db.prepare(salesByMonthQuery);
      const salesByMonth = salesByMonthStmt.all(startDateStr, endDateStr);
      
      // Top products by revenue (within date range)
      const topProductsStmt = db.prepare(`
        SELECT 
          p.name,
          SUM(si.quantity) as quantity,
          SUM(si.totalPrice) as revenue
        FROM sale_items si
        JOIN products p ON si.productId = p.id
        JOIN sales s ON si.saleId = s.id
        WHERE DATE(s.saleDate) BETWEEN ? AND ?
        GROUP BY si.productId, p.name
        ORDER BY revenue DESC
        LIMIT 5
      `);
      const topProducts = topProductsStmt.all(startDateStr, endDateStr);
      
      // Client distribution by company vs individual
      const clientDistributionStmt = db.prepare(`
        SELECT 
          CASE 
            WHEN company IS NOT NULL AND company != '' THEN 'Entreprises' 
            ELSE 'Particuliers' 
          END as clientType,
          COUNT(*) as count
        FROM clients
        GROUP BY clientType
      `);
      const clientDistributionRaw = clientDistributionStmt.all();
      
      // Convert to the expected format
      const clientDistribution = clientDistributionRaw.map(item => ({
        name: item.clientType || 'Inconnu',
        value: item.count || 0
      }));
      
      // Ensure we have all client types
      const clientTypes = ['Entreprises', 'Particuliers', 'Associations'];
      clientTypes.forEach(type => {
        if (!clientDistribution.find(item => item.name === type)) {
          clientDistribution.push({ name: type, value: 0 });
        }
      });
      
      // Return properly formatted data
      return {
        todayRevenue: todayRevenue.revenue || 0,
        monthlyRevenue: monthlyRevenue.revenue || 0,
        totalClients: totalClients.count || 0,
        totalProducts: totalProducts.count || 0,
        lowStockProducts: lowStockProducts.count || 0,
        totalSales: totalSales.count || 0,
        pendingInvoices: pendingInvoices.count || 0,
        overdueInvoices: overdueInvoices.count || 0,
        recentSales: recentSales || [],
        salesByMonth: salesByMonth || [],
        topProducts: topProducts || [],
        clientDistribution: clientDistribution || [],
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      // Return default values in case of error
      return {
        todayRevenue: 0,
        monthlyRevenue: 0,
        totalClients: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        totalSales: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        recentSales: [],
        salesByMonth: [],
        topProducts: [],
        clientDistribution: [],
      };
    }
  });
};