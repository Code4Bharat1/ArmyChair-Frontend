import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes.jsx";

export default function SalesLayout({ children }) {
  return <ProtectedRoute allowedRoles={["sales"]}>{children}</ProtectedRoute>;
}
