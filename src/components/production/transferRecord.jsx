"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ArrowRightLeft, Clock, MapPin, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionTransfersPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "production") {
      router.push("/login");
    }
  }, [router]);

  /* ================= FETCH TRANSFERS ================= */
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const res = await axios.get(
          `${API}/transfer/stock-movement`,
          { headers }
        );

        setMovements(res.data.movements || []);
      } catch (err) {
        console.error("Fetch transfers failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, []);

  /* ================= FILTER ONLY PRODUCTION ================= */
 const productionTransfers = useMemo(() => {
  return movements.filter((m) =>
    m.toLocation?.startsWith("PROD_")
  );
}, [movements]);


  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <ArrowRightLeft className="text-[#c62d23]" />
        Production Transfer Records
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : productionTransfers.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow">
          No transfers found
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Part</th>
                <th className="p-4 text-center">Qty</th>
                <th className="p-4 text-left">From</th>
                <th className="p-4 text-left">To</th>
                <th className="p-4 text-left">Moved By</th>
                <th className="p-4 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {productionTransfers.map((m) => (
  <tr key={m._id} className="border-t hover:bg-gray-50">

    <td className="p-4">
      {m.partName || m.chairType}
    </td>

    <td className="p-4 text-center font-semibold text-[#c62d23]">
      {m.quantity}
    </td>

    <td className="p-4">
      <div className="flex items-center gap-2">
        <MapPin size={14} />
        {m.fromLocation}
      </div>
    </td>

    <td className="p-4">
      <div className="flex items-center gap-2">
        <MapPin size={14} />
        {m.toLocation}
      </div>
    </td>

    <td className="p-4">
      <div className="flex items-center gap-2">
        <User size={14} />
        {m.movedBy?.name || "Unknown"}
      </div>
    </td>

    <td className="p-4">
      <div className="flex items-center gap-2">
        <Clock size={14} />
        {new Date(m.createdAt).toLocaleString()}
      </div>
    </td>

  </tr>
))}

            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
