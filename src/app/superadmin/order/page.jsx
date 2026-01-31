import { Suspense } from "react";
import SalesOrders from "@/components/Superadmin/order";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading orders...</div>}>
      <SalesOrders />
    </Suspense>
  );
}
