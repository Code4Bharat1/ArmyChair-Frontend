import { Suspense } from "react";
import SparePartsAdmin from "@/components/Superadmin/spareparts";

const Page = () => {
  return (
    <Suspense fallback={<div className="p-8">Loading spare parts...</div>}>
      <SparePartsAdmin />
    </Suspense>
  );
};

export default Page;
