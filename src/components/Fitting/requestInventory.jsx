"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Package, Send, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import FittingSidebar from "./sidebar";

export default function FittingRequestInventory() {
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [materials, setMaterials] = useState([]);
  const [requestQty, setRequestQty] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ORDERS ================= */
  useEffect(() => {
    const fetchOrders = async () => {
      const res = await axios.get(`${API}/orders`, { headers });

      const fittingOrders = (res.data.orders || []).filter((o) =>
        ["PRODUCTION_COMPLETED", "FITTING_IN_PROGRESS"].includes(o.progress)
      );

      setOrders(fittingOrders);
    };

    fetchOrders();
  }, []);

  /* ================= FETCH MATERIALS FOR ORDER ================= */
  const fetchMaterials = async (orderId) => {
    const res = await axios.get(`${API}/orders/${orderId}/inventory-preview`, {
      headers,
    });

    setMaterials(res.data.parts || []);
  };

  /* ================= HANDLE ORDER SELECT ================= */
  const handleOrderSelect = (id) => {
    setSelectedOrder(id);
    fetchMaterials(id);
  };

  /* ================= SEND REQUEST ================= */
  const sendRequest = async (partName) => {
    if (!requestQty[partName] || requestQty[partName] <= 0) {
      return alert("Enter valid quantity");
    }

    setLoading(true);

    try {
      await axios.post(
        `${API}/production/inward`,
        {
          partName,
          quantity: requestQty[partName],
          location: "FITTING_SECTION",
        },
        { headers }
      );

      alert("Stock request sent successfully");

      setRequestQty((prev) => ({
        ...prev,
        [partName]: "",
      }));
    } catch (err) {
      alert(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        
              <FittingSidebar />
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Package size={30} className="text-[#c62d23]" />
          <h1 className="text-2xl font-bold">
            Fitting - Request Inventory
          </h1>
        </div>

        {/* ORDER SELECT */}
        <div className="bg-white p-6 rounded-xl border">
          <label className="block text-sm font-medium mb-2">
            Select Order
          </label>

          <select
            value={selectedOrder}
            onChange={(e) => handleOrderSelect(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select Order</option>
            {orders.map((o) => (
              <option key={o._id} value={o._id}>
                {o.orderId} — {o.chairModel}
              </option>
            ))}
          </select>
        </div>

        {/* MATERIAL LIST */}
        {materials.length > 0 && (
          <div className="bg-white p-6 rounded-xl border space-y-4">
            <h3 className="text-lg font-semibold">
              Required Materials
            </h3>

            {materials.map((part) => {
              const shortage =
                part.requiredTotal - part.totalAvailable;

              return (
                <div
                  key={part.partName}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{part.partName}</p>
                    <p className="text-sm text-gray-500">
                      Required: {part.requiredTotal} | Available:{" "}
                      {part.totalAvailable}
                    </p>
                    {shortage > 0 && (
                      <p className="text-sm text-red-500">
                        Shortage: {shortage}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={requestQty[part.partName] || ""}
                      onChange={(e) =>
                        setRequestQty((prev) => ({
                          ...prev,
                          [part.partName]: Number(e.target.value),
                        }))
                      }
                      className="w-24 border rounded-lg px-3 py-2"
                    />

                    <button
                      onClick={() => sendRequest(part.partName)}
                      className="bg-[#c62d23] text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <Send size={16} />
                          Request
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
