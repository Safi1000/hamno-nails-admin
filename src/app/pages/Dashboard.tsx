import { useState, useEffect } from "react";
import { Package, ShoppingCart, Users, TrendingUp, Star, Gift, Loader2 } from "lucide-react";

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [quickStats, setQuickStats] = useState({ revenue: 0, giftBoxes: 0, satisfaction: 98 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        };

        const [productsRes, ordersRes, customersRes] = await Promise.all([
          fetch('/admin/api/products', { headers }),
          fetch('/admin/api/orders', { headers }),
          fetch('/admin/api/customers', { headers })
        ]);

        if (!productsRes.ok || !ordersRes.ok || !customersRes.ok) throw new Error('Failed to fetch data');

        const products = await productsRes.json();
        const orders = await ordersRes.json();
        const customers = await customersRes.json();

        // 1. Calculate Primary Stats
        const activeOrders = orders.filter((o: any) => ['Pending', 'Processing', 'Shipped'].includes(o.status)).length;
        const vipClients = customers.filter((c: any) => (c.tags && c.tags.includes('VIP')) || c.total_orders >= 5).length;

        setStats([
          { label: "Total Products", value: products.length.toString(), icon: Package, color: "#7A0D19", bgColor: "#7A0D1910" },
          { label: "Active Orders", value: activeOrders.toString(), icon: ShoppingCart, color: "#E5B6BB", bgColor: "#E5B6BB30" },
          { label: "Total Customers", value: customers.length.toString(), icon: Users, color: "#F2D2D6", bgColor: "#F2D2D630" },
          { label: "VIP Clients", value: vipClients.toString(), icon: Star, color: "#7A0D19", bgColor: "#7A0D1910" },
        ]);

        // 2. Calculate Recent Orders
        const formattedRecent = orders.slice(0, 4).map((o: any) => ({
          id: o.friendly_id,
          customer: o.customers?.name || "Unknown",
          status: o.status,
          total: o.total
        }));
        setRecentOrders(formattedRecent);

        // 3. Calculate Top Products
        const productStats: Record<string, { orders: number, revenue: number }> = {};
        orders.forEach((o: any) => {
          if (o.order_items) {
            o.order_items.forEach((item: any) => {
              if (!productStats[item.product_name]) {
                productStats[item.product_name] = { orders: 0, revenue: 0 };
              }
              productStats[item.product_name].orders += item.quantity;
              productStats[item.product_name].revenue += (item.quantity * item.price);
            });
          }
        });

        const sortedTopProducts = Object.entries(productStats)
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3);
        setTopProducts(sortedTopProducts);

        // 4. Calculate Quick Stats
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyRevenue = orders
          .filter((o: any) => {
            const d = new Date(o.created_at);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((sum: number, o: any) => sum + Number(o.total), 0);

        const giftBoxes = orders.filter((o: any) => o.packaging_option && o.packaging_option !== 'Standard').length;

        setQuickStats({
          revenue: monthlyRevenue,
          giftBoxes: giftBoxes,
          satisfaction: 98 // Hardcoded for now without Review DB
        });

      } catch (err) {
        console.error("Dashboard calculation error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "#6B7280";
      case "Processing": return "#F59E0B";
      case "Shipped": return "#3B82F6";
      case "Delivered": return "#10B981";
      default: return "#6B7280";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A0D19]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 
          className="text-[#7A0D19]"
          style={{ 
            fontFamily: 'Playfair Display, serif',
            fontSize: '2.5rem',
            fontWeight: 600,
          }}
        >
          Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening with your luxury nail studio.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-2xl p-6 transition-all hover:translate-y-[-4px]"
            style={{
              background: 'white',
              boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: stat.bgColor }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <div
                className="text-3xl mb-1"
                style={{ 
                  fontFamily: 'Playfair Display, serif',
                  color: '#7A0D19',
                  fontWeight: 600
                }}
              >
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'white',
            boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontFamily: 'Playfair Display, serif',
              color: '#7A0D19',
              fontSize: '1.5rem',
            }}
          >
            Recent Orders
          </h2>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: '#FCF9F7' }}
              >
                <div className="flex-1">
                  <div
                    className="mb-1"
                    style={{ 
                      fontFamily: 'Playfair Display, serif',
                      color: '#7A0D19',
                      fontWeight: 600
                    }}
                  >
                    #{order.id}
                  </div>
                  <div className="text-sm text-gray-600">{order.customer}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      background: `${getStatusColor(order.status)}20`,
                      color: getStatusColor(order.status),
                    }}
                  >
                    {order.status}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      color: '#7A0D19',
                      fontWeight: 600
                    }}
                  >
                    Rs. {order.total.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'white',
            boxShadow: '0 8px 24px rgba(122, 13, 25, 0.12)',
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontFamily: 'Playfair Display, serif',
              color: '#7A0D19',
              fontSize: '1.5rem',
            }}
          >
            Top Products
          </h2>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                      style={{
                        background: '#7A0D19',
                        color: 'white',
                        fontFamily: 'Playfair Display, serif',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div
                        className="text-sm"
                        style={{ color: '#7A0D19', fontWeight: 500 }}
                      >
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.orders} orders
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      color: '#7A0D19',
                      fontWeight: 600
                    }}
                  >
                    Rs. {product.revenue.toLocaleString()}
                  </div>
                </div>
                {index < topProducts.length - 1 && (
                  <div
                    className="h-px"
                    style={{ background: '#F2D2D6' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, #7A0D19 0%, #E5B6BB 100%)',
            color: 'white',
            boxShadow: '0 8px 24px rgba(122, 13, 25, 0.3)',
          }}
        >
          <div
            className="text-3xl mb-2"
            style={{ fontFamily: 'Playfair Display, serif', fontWeight: 600 }}
          >
            Rs. {quickStats.revenue.toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Total Revenue (This Month)</div>
        </div>

        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'white',
            border: '2px solid #E5B6BB',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="w-6 h-6" style={{ color: '#7A0D19' }} />
            <div
              className="text-3xl"
              style={{ 
                fontFamily: 'Playfair Display, serif',
                color: '#7A0D19',
                fontWeight: 600
              }}
            >
              {quickStats.giftBoxes}
            </div>
          </div>
          <div className="text-sm text-gray-600">Luxury Gift Boxes Sold</div>
        </div>

        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'white',
            border: '2px solid #F2D2D6',
          }}
        >
          <div
            className="text-3xl mb-2"
            style={{ 
              fontFamily: 'Playfair Display, serif',
              color: '#7A0D19',
              fontWeight: 600
            }}
          >
            {quickStats.satisfaction}%
          </div>
          <div className="text-sm text-gray-600">Customer Satisfaction</div>
        </div>
      </div>
    </div>
  );
}
