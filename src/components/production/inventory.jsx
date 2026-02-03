"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Package, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionStockPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [inventory, setInventory] = useState([]);
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

  /* ================= FETCH INVENTORY ================= */
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await axios.get(`${API}/inventory`, { headers });

        setInventory(res.data.inventory || []);
      } catch (err) {
        console.error("Fetch inventory failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  /* ================= FILTER ONLY PROD LOCATIONS ================= */
  const productionStock = useMemo(() => {
    return inventory.filter((item) =>
      item.location?.startsWith("PROD_")
    );
  }, [inventory]);

  /* ================= GROUP BY LOCATION + PART ================= */
  const grouped = useMemo(() => {
    const result = {};

    productionStock.forEach((item) => {
      const key = `${item.location}_${item.partName || item.chairType}`;

      if (!result[key]) {
        result[key] = {
          part: item.partName || item.chairType,
          location: item.location,
          quantity: 0,
        };
      }

      result[key].quantity += item.quantity;
    });

    return Object.values(result);
  }, [productionStock]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Package className="text-[#c62d23]" />
        Production Stock
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : grouped.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow">
          No stock available for production
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.map((item, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow border border-gray-200"
            >
              <h3 className="font-semibold text-lg">
                {item.part}
              </h3>

              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <MapPin size={14} />
                {item.location}
              </p>

              <p className="mt-4 text-2xl font-bold text-[#c62d23]">
                {item.quantity}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
