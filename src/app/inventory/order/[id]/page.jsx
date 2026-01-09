"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { PackageCheck, ArrowLeft } from "lucide-react";
// import InventorySidebar from "../../sidebar";

export default function PickOrderPage() {
  const { id } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [parts, setParts] = useState([]);
  const [picks, setPicks] = useState({}); // { inventoryId: qty }
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  /* ================= API ================= */
  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH PICK DATA ================= */
  const fetchPickData = async () => {
    try {
      const res = await axios.get(
        `${API}/warehouse/order/${id}/pick-data`,
        { headers }
      );

      setOrder(res.data.order);
      setParts(res.data.parts || []);
    } catch (err) {
      console.error("Pick data fetch failed:", err);
      alert(err?.response?.data?.message || "Failed to load pick data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPickData();
  }, [id]);

  /* ================= HANDLE PICK ================= */
  const updatePick = (inventoryId, value) => {
    const qty = Number(value);

    setPicks((prev) => ({
      ...prev,
      [inventoryId]: qty > 0 ? qty : 0,
    }));
  };

  /* ================= SEND TO FITTING ================= */
  const handleSendToFitting = async () => {
    const items = Object.entries(picks)
      .filter(([_, qty]) => qty > 0)
      .map(([inventoryId, qty]) => ({
        inventoryId,
        qty,
      }));

    if (items.length === 0) {
      return alert("Please select at least one item to send");
    }

    if (!confirm("Send selected parts to fitting?")) return;

    try {
      setSending(true);

      await axios.post(
        `${API}/warehouse/order/dispatch`,
        {
          orderId: id,
          items,
        },
        { headers }
      );

      alert("Parts sent to fitting successfully");
      router.push("/inventory/order");
    } catch (err) {
      console.error("Dispatch failed:", err);
      alert(err?.response?.data?.message || "Failed to send parts");
    } finally {
      setSending(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      {/* <InventorySidebar /> */}

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pick Spare Parts</h1>
            <p className="text-sm text-neutral-400">
              Select quantities from each location
            </p>
          </div>

          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-10">Loading pick data...</div>
          ) : !order ? (
            <div className="text-center text-red-400 py-10">
              Order not found
            </div>
          ) : (
            <>
              {/* ORDER INFO */}
              <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-400">Order ID</span>
                    <p className="font-medium">{order.orderId}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400">Dispatched To</span>
                    <p className="font-medium">{order.dispatchedTo}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400">Chair Model</span>
                    <p className="font-medium">{order.chairModel}</p>
                  </div>
                </div>
              </div>

              {/* PARTS PICK LIST */}
              <div className="space-y-6">
                {parts.length === 0 ? (
                  <div className="text-center text-neutral-400 py-10">
                    No spare parts available in inventory
                  </div>
                ) : (
                  parts.map((part) => (
                    <div
                      key={part.partName}
                      className="bg-neutral-800 border border-neutral-700 rounded-xl p-5"
                    >
                      <h3 className="font-semibold mb-3">
                        {part.partName}
                      </h3>

                      <div className="space-y-3">
                        {part.locations.map((loc) => (
                          <div
                            key={loc.inventoryId}
                            className="flex items-center justify-between gap-4 bg-neutral-900 px-4 py-3 rounded-lg"
                          >
                            <div className="text-sm">
                              <p className="font-medium">
                                Location: {loc.location}
                              </p>
                              <p className="text-neutral-400 text-xs">
                                Available: {loc.available}
                              </p>
                            </div>

                            <input
                              type="number"
                              min="0"
                              max={loc.available}
                              placeholder="Qty"
                              className="w-24 bg-neutral-800 border border-neutral-700 px-3 py-1 rounded outline-none text-sm"
                              onChange={(e) =>
                                updatePick(
                                  loc.inventoryId,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ACTION */}
              {parts.length > 0 && (
                <div className="flex justify-end mt-8">
                  <button
                    disabled={sending}
                    onClick={handleSendToFitting}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg text-white disabled:opacity-50"
                  >
                    <PackageCheck size={18} />
                    {sending ? "Sending..." : "Send to Fitting"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
