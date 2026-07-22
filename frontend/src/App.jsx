import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LayoutDashboard, Car, CalendarCheck, Heart, User, Users, Tags, ShieldAlert, ShieldOff } from "lucide-react";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import PublicLayout from "./layouts/PublicLayout";
import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";

import Home from "./pages/Home";
import VehicleBrowse from "./pages/VehicleBrowse";
import VehicleDetail from "./pages/VehicleDetail";
import BookVehicle from "./pages/BookVehicle";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import MagicLinkRequest from "./pages/auth/MagicLinkRequest";
import MagicLinkVerify from "./pages/auth/MagicLinkVerify";

import CustomerDashboard from "./pages/customer/CustomerDashboard";
import MyBookings from "./pages/customer/MyBookings";
import Favorites from "./pages/customer/Favorites";

import VendorDashboard from "./pages/vendor/VendorDashboard";
import MyVehicles from "./pages/vendor/MyVehicles";
import AddVehicle from "./pages/vendor/AddVehicle";
import EditVehicle from "./pages/vendor/EditVehicle";
import BookingRequests from "./pages/vendor/BookingRequests";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageVehicles from "./pages/admin/ManageVehicles";
import ManageCategories from "./pages/admin/ManageCategories";
import ManageAuditLogs from "./pages/admin/ManageAuditLogs";
import ManageIpAccess from "./pages/admin/ManageIpAccess";

const customerNavItems = [
  { to: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/customer/bookings", label: "My Bookings", icon: CalendarCheck },
  { to: "/customer/favorites", label: "Favorites", icon: Heart },
  { to: "/customer/profile", label: "Profile", icon: User },
];

const vendorNavItems = [
  { to: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/vendor/vehicles", label: "My Vehicles", icon: Car },
  { to: "/vendor/bookings", label: "Booking Requests", icon: CalendarCheck },
  { to: "/vendor/profile", label: "Profile", icon: User },
];

const adminNavItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/vehicles", label: "Vehicles", icon: Car },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/audit-logs", label: "Audit Trail", icon: ShieldAlert },
  { to: "/admin/ip-access", label: "IP Access", icon: ShieldOff },
  { to: "/admin/profile", label: "Profile", icon: User },
];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#161f29", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/vehicles" element={<VehicleBrowse />} />
            <Route path="/vehicles/:id" element={<VehicleDetail />} />
            <Route
              path="/vehicles/:id/book"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <BookVehicle />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/login/magic-link" element={<MagicLinkRequest />} />
            <Route path="/magic-link/verify" element={<MagicLinkVerify />} />
          </Route>

          {/* Customer dashboard */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <DashboardLayout navItems={customerNavItems} roleLabel="Customer" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Vendor dashboard */}
          <Route
            path="/vendor"
            element={
              <ProtectedRoute allowedRoles={["vendor"]}>
                <DashboardLayout navItems={vendorNavItems} roleLabel="Vendor" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="vehicles" element={<MyVehicles />} />
            <Route path="vehicles/add" element={<AddVehicle />} />
            <Route path="vehicles/edit/:id" element={<EditVehicle />} />
            <Route path="bookings" element={<BookingRequests />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Admin dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DashboardLayout navItems={adminNavItems} roleLabel="Admin" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="vehicles" element={<ManageVehicles />} />
            <Route path="categories" element={<ManageCategories />} />
            <Route path="audit-logs" element={<ManageAuditLogs />} />
            <Route path="ip-access" element={<ManageIpAccess />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
