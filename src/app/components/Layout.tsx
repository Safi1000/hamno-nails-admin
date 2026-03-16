import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Package, ShoppingCart, Users, CreditCard, Megaphone, LayoutDashboard, LogOut, Sparkles } from "lucide-react";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/products", icon: Package, label: "Products" },
    { path: "/orders", icon: ShoppingCart, label: "Orders" },
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/payments", icon: CreditCard, label: "Payments" },
    { path: "/banner", icon: Megaphone, label: "Banner" },
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path || (location.pathname === "/" && path === "/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };
  
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Glassmorphic Sidebar */}
      <aside 
        className="w-64 min-h-screen fixed left-0 top-0 border-r"
        style={{
          background: 'rgba(122, 13, 25, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                background: 'rgba(252, 249, 247, 0.95)',
                boxShadow: '0 4px 12px rgba(229, 182, 187, 0.3)',
              }}
            >
              <Sparkles className="w-6 h-6 text-[#7A0D19]" />
            </div>
            <h1 
              className="text-white"
              style={{ 
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              nailsbyhamno
            </h1>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200"
                style={{
                  background: isActive(item.path) 
                    ? 'rgba(229, 182, 187, 0.2)' 
                    : 'transparent',
                  color: '#FFFFFF',
                }}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <button
            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 mt-4"
            style={{
              background: 'rgba(229, 182, 187, 0.2)',
              color: '#FFFFFF',
            }}
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}