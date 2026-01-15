import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes";

export default function FittingLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={["fitting"]}>
      {children}
    </ProtectedRoute>
  );
}
