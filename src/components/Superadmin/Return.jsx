"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, X } from "lucide-react";
import Sidebar from "@/components/Superadmin/sidebar";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL
const getAuthHeaders = () => {
  
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};


const Return = () => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  // 🔥 RETURNS FROM API
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 MODAL STATE
  const [openModal, setOpenModal] = useState(false);

  // 🔥 FORM STATE (✅ FIXED)
  const [form, setForm] = useState({
    orderId: "",
    chairType: "",
    description: "",
    quantity: 1,
    returnDate: "",
    category: "Functional",
    vendor: "",
    location: "",
  });

  /* ================= FETCH RETURNS ================= */
  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/returns`, { headers: getAuthHeaders() });
      setReturns(res.data.data);
    } catch (error) {
      console.error("Failed to fetch returns", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  /* ================= FILTER LOGIC ================= */
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        r.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        r.chairType?.toLowerCase().includes(search.toLowerCase());

      const matchType =
        selectedType === "All" || r.category === selectedType;

      return matchSearch && matchType && !r.movedToInventory;
    });
  }, [search, selectedType, returns]);

  /* ================= MOVE TO INVENTORY ================= */
  const moveToInventory = async (id) => {
    try {
      await axios.post(`${API}/returns/${id}/move-to-inventory`, {}, { headers : getAuthHeaders()});
      fetchReturns();

  window.dispatchEvent(new Event("inventoryUpdated"));
} catch (error) {
  console.error("Failed to move to inventory", error);
}
};

  /* ================= ADD RETURN ================= */
  const submitReturn = async () => {
    try {
      await axios.post(`${API}/returns`, form, { headers : getAuthHeaders() });
      setOpenModal(false);
      setForm({
        orderId: "",
        chairType: "",
        description: "",
        quantity: 1,
        returnDate: "",
        category: "Functional",
        vendor: "",
        location: "",
      });
      fetchReturns();
    } catch (error) {
      console.error("Failed to add return", error);
    }
  };

  /* ================= EXPORT ================= */
  const exportCSV = () => {
    if (returns.length === 0) return;

    const headers = ["Order ID", "Product", "Return Date", "Category"].join(",");

    const rows = filteredReturns
      .map(
        (r) =>
          `${r.orderId},${r.chairType},${new Date(
            r.returnDate
          ).toLocaleDateString()},${r.category}`
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "returns-report.csv";
    a.click();
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* ================= HEADER ================= */}
        <div className="bg-neutral-800 border-b border-neutral-700 mb-8 p-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white">
              Returns Management
            </h1>
            <p className="text-sm text-neutral-400">
              Track returned orders and route functional items to inventory and
              non-functional items to defects.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setOpenModal(true)}
              className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Returns
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>

        {/* ================= FILTERS ================= */}
       <div className="flex flex-wrap items-end gap-6 mb-6">
  {/* SEARCH */}
  <div className="relative ml-5 w-full sm:w-[320px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search return by ID or product..."
      className="w-full h-[42px] bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
    />
  </div>

  {/* TYPE FILTER */}
  <div className="flex flex-col">
    <label className="mb-1 text-xs text-neutral-400">
      Type
    </label>
    <select
      value={selectedType}
      onChange={(e) => setSelectedType(e.target.value)}
      className="h-[42px] px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-600"
    >
      <option value="All">All</option>
      <option value="Functional">Functional</option>
      <option value="Non-Functional">Non-Functional</option>
    </select>
  </div>
</div>


        {/* ================= TABLE ================= */}
        <div className="bg-neutral-800 m-5 border border-neutral-700 rounded-lg overflow-hidden">
          <table className=" w-full">
            <thead className="border-b border-neutral-700">
              <tr>
                {["Order ID", "Product", "Return Date", "Category", "Action"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-center p-4 text-xs font-medium text-neutral-400 uppercase"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {filteredReturns.map((r) => (
                <tr
                  key={r._id}
                  className="border-b text-center border-neutral-700 hover:bg-neutral-750"
                >
                  <td className="px-6 py-4 text-white">{r.orderId}</td>

                  <td className="px-6 py-4">
                    <div className="text-white">{r.chairType}</div>
                    <div className="text-xs text-neutral-500">
                      {r.description}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-neutral-300">
                    {new Date(r.returnDate).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-neutral-300">
                    {r.category}
                  </td>

                  <td
                    onClick={() => moveToInventory(r._id)}
                    className="px-6 py-4 font-medium text-amber-500 cursor-pointer hover:underline"
                  >
                    Move to Inventory
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {openModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 w-full max-w-lg rounded-lg p-6 border border-neutral-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">
                Add Return Order
              </h2>
              <X
                className="cursor-pointer text-neutral-400"
                onClick={() => setOpenModal(false)}
              />
            </div>

            <div className="space-y-4">
              <input
                placeholder="Order ID"
                value={form.orderId}
                onChange={(e) =>
                  setForm({ ...form, orderId: e.target.value })
                }
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded"
              />

              <input
                placeholder="Product"
                value={form.chairType}
                onChange={(e) =>
                  setForm({ ...form, chairType: e.target.value })
                }
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded"
              />

              <input
                placeholder="Vendor"
                value={form.vendor}
                onChange={(e) =>
                  setForm({ ...form, vendor: e.target.value })
                }
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded"
              />

              <input
                placeholder="Location"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded"
              />

              <input
                type="date"
                value={form.returnDate}
                onChange={(e) =>
                  setForm({ ...form, returnDate: e.target.value })
                }
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded"
              />

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded"
              >
                <option>Functional</option>
                <option>Non-Functional</option>
              </select>

              <button
                onClick={submitReturn}
                className="w-full bg-amber-600 hover:bg-amber-700 py-2 rounded font-medium"
              >
                Add Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Return;
