"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import InventorySidebar from "@/components/Inventory/sidebar";

export default function WarehousePendingInwardPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [mounted, setMounted] = useState(false);

  /* ================= MOUNT ================= */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    if (!mounted) return;

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "warehouse") {
      router.push("/login");
    }
  }, [mounted, router]);

  /* ================= FETCH PENDING ================= */
  const fetchPending = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!API) throw new Error("API URL missing");
      if (!token) throw new Error("Token missing");

      const res = await axios.get(
        `${API}/warehouse/production/inward/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setData(res.data?.data || []);
    } catch (err) {
      console.error("Fetch pending failed:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH ONCE AFTER MOUNT ================= */
  useEffect(() => {
    if (!mounted) return;
    fetchPending();
  }, [mounted]);

  /* ================= ACCEPT ================= */
  const acceptInward = async (id) => {
    if (!confirm("Accept this inward stock?")) return;

    try {
      setProcessingId(id);

      await axios.put(
        `${API}/warehouse/production/inward/${id}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("Stock accepted and inventory updated");
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.message || "Accept failed");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= DATE FORMAT ================= */
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      {/* SIDEBAR */}
      <InventorySidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          Warehouse – Pending Production Inward
        </h1>

        {loading ? (
          <p>Loading...</p>
        ) : data.length === 0 ? (
          <div className="bg-neutral-800 p-6 rounded text-neutral-400">
            No pending inward assigned to you
          </div>
        ) : (
          <div className="overflow-x-auto bg-neutral-800 rounded-lg border border-neutral-700">
            <table className="w-full">
              <thead className="bg-neutral-900 border-b border-neutral-700">
                <tr>
                  {["Date", "Material", "Quantity", "Created By", "Action"].map(
                    (h) => (
                      <th
                        key={h}
                        className="p-3 text-left text-xs text-neutral-400 uppercase"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {data.map((i) => (
                  <tr
                    key={i._id}
                    className="border-b border-neutral-700 hover:bg-neutral-900"
                  >
                    <td className="p-3">{formatDate(i.createdAt)}</td>
                    <td className="p-3 font-medium">{i.partName}</td>
                    <td className="p-3">{i.quantity}</td>
                    <td className="p-3">{i.createdBy?.name || "-"}</td>
                    <td className="p-3">
                      <button
                        disabled={processingId === i._id}
                        onClick={() => acceptInward(i._id)}
                        className={`px-4 py-1 rounded text-sm ${
                          processingId === i._id
                            ? "bg-neutral-600 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {processingId === i._id ? "Processing..." : "Accept"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
