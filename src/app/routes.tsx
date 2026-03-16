import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Orders } from "./pages/Orders";
import { Customers } from "./pages/Customers";
import { Payments } from "./pages/Payments";
import { BannerSettings } from "./pages/BannerSettings";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "products", Component: Products },
      { path: "orders", Component: Orders },
      { path: "customers", Component: Customers },
      { path: "payments", Component: Payments },
      { path: "banner", Component: BannerSettings },
    ],
  },
], { basename: "/admin" });