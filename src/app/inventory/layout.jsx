import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes.jsx";

export default function InventoryLayout({ children }) {
  return <ProtectedRoute allowedRoles={["warehouse"]}>{children}</ProtectedRoute>;
}
