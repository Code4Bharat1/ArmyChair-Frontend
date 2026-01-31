"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Boxes,
  TrendingDown,
  Warehouse,
  MapPin,
  Building2,
  ArrowLeftRight,
  Menu,
  X,
  UserCircle,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";
import { useRouter } from "next/navigation";

/* ================= PAGE ================= */
export default function SparePartsInventory() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const role =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user"))?.role
      : null;

  /* FORM */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    partName: "", // Spare Part Name
    location: "",
    quantity: "",
    maxQuantity: "",
  });

  const VENDORS = ["Ramesh", "Suresh", "Mahesh", "Akash", "Vikram", "Amit"];

  const LOCATIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  /* TRANSFER */
  const [showTransfer, setShowTransfer] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [transferItem, setTransferItem] = useState(null);
  const [transfer, setTransfer] = useState({
    toLocation: "",
    quantity: "",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchParts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/spare-parts`, { headers });
      setItems(res.data.inventory || res.data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  /* ================= SAVE ================= */
  const submitPart = async () => {
    try {
      if (!form.partName || !form.location || form.quantity === "") {
        return alert("All fields required");
      }

      const payload = {
        partName: form.partName,
        location: form.location,
        quantity: Number(form.quantity),
      };

      if (role === "admin" && form.maxQuantity !== "") {
        payload.maxQuantity = Number(form.maxQuantity);
      }

      if (editId) {
        await axios.patch(
          `${API}/inventory/spare-parts/update/${editId}`,
          payload,
          { headers },
        );
      } else {
        await axios.post(`${API}/inventory/spare-parts`, payload, { headers });
      }

      setShowForm(false);
      setForm({
        partName: "",
        location: "",
        quantity: "",
        maxQuantity: "",
      });

      setEditId(null);
      fetchParts();
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  /* ================= DELETE ================= */
  const deletePart = async (id) => {
    if (!confirm("Delete this spare part?")) return;
    try {
      await axios.delete(`${API}/inventory/spare-parts/delete/${id}`, {
        headers,
      });
      fetchParts();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  /* ================= TRANSFER ================= */
  const submitTransfer = async () => {
    try {
      if (!transfer.toLocation || transfer.quantity === "") {
        return alert("Destination location and quantity required");
      }

      const qty = Number(transfer.quantity);
      if (qty <= 0) return alert("Quantity must be greater than 0");
      if (qty > transferItem.quantity)
        return alert("Not enough stock in source location");

      const payload = {
        sourceId: transferItem.id, // ✅ ID-based transfer
        toLocation: transfer.toLocation,
        quantity: qty,
      };

      await axios.post(`${API}/transfer`, payload, { headers });

      setShowTransfer(false);
      setTransfer({ toLocation: "", quantity: "" });
      setTransferItem(null);
      fetchParts();
    } catch (err) {
      console.error("Transfer failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Transfer failed");
    }
  };
  const formatRole = (role) =>
    role ? role.charAt(0).toUpperCase() + role.slice(1) : "—";

  /* ================= DATA ================= */
  const data = useMemo(() => {
    return items.map((i) => ({
      id: i._id,
      name: i.partName,
      source: `${formatRole(i.createdByRole)} - ${i.createdBy?.name || "—"}`,
      location: i.location,
      quantity: i.quantity,
      maxQuantity: i.maxQuantity,
      status: i.status,
    }));
  }, [items]);
  const filteredData = useMemo(() => {
    if (statusFilter === "ALL") return data;

    if (statusFilter === "LOW") {
      return data.filter(
        (i) => i.status === "Low Stock" || i.status === "Critical",
      );
    }

    if (statusFilter === "OVERSTOCK") {
      return data.filter((i) => i.status === "Overstocked");
    }

    return data;
  }, [data, statusFilter]);

  /* ================= LOCATIONS (FOR DROPDOWN) ================= */
  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location));
    return Array.from(set);
  }, [items]);

  /* ================= STATS ================= */
  const totalParts = data.length;
  const totalQty = data.reduce((s, i) => s + i.quantity, 0);
  const lowStock = data.filter(
    (i) => i.status === "Low Stock" || i.status === "Critical"
  ).length;
  const overStock = data.filter((i) => i.status === "Overstocked").length;

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <InventorySidebar />
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <Menu size={24} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  Spare Parts Inventory
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-2 hidden sm:block">
                  Manage your spare parts stock levels and details
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 sm:gap-2 transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm md:text-base"
              >
                <Plus size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Add Inventory</span>
                <span className="sm:hidden">Add</span>
              </button>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition p-1 sm:p-0"
              >
                <UserCircle size={28} className="sm:w-8 sm:h-8 md:w-9 md:h-9" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <KpiCard
              title="Total Parts"
              value={totalParts}
              icon={<Boxes className="text-[#c62d23]" />}
              active={statusFilter === "ALL"}
              onClick={() => setStatusFilter("ALL")}
            />

            <KpiCard
              title="Total Quantity"
              value={totalQty}
              icon={<Warehouse className="text-[#c62d23]" />}
            />
            <KpiCard
              title="Low / Critical"
              value={lowStock}
              icon={<TrendingDown className="text-[#c62d23]" />}
              danger
              active={statusFilter === "LOW"}
              onClick={() => setStatusFilter("LOW")}
            />

            <KpiCard
              title="Overstocked"
              value={overStock}
              icon={<Boxes className="text-blue-600" />}
              info
              active={statusFilter === "OVERSTOCK"}
              onClick={() => setStatusFilter("OVERSTOCK")}
            />
          </div>

          {/* ALERT */}
          {lowStock > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex gap-2 sm:gap-3 items-center">
              <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
              <span className="text-red-700 font-medium text-xs sm:text-sm">
                {lowStock} spare parts need restocking
              </span>
            </div>
          )}

          {/* TABLE - Desktop */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-xl lg:rounded-2xl p-4 sm:p-6 shadow-sm">
            <h2 className="font-bold text-base sm:text-lg text-gray-900 mb-4 sm:mb-6">
              Spare Parts Overview
            </h2>

            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 lg:p-4 font-semibold text-gray-700 text-xs lg:text-sm">
                      Part
                    </th>
                    <th className="text-left p-3 lg:p-4 font-semibold text-gray-700 text-xs lg:text-sm">
                      Source
                    </th>
                    <th className="text-left p-3 lg:p-4 font-semibold text-gray-700 text-xs lg:text-sm">
                      Qty
                    </th>
                    <th className="text-left p-3 lg:p-4 font-semibold text-gray-700 text-xs lg:text-sm">
                      Max Qty
                    </th>
                    <th className="text-left p-3 lg:p-4 font-semibold text-gray-700 text-xs lg:text-sm">
                      Location
                    </th>
                    <th className="text-left p-3 lg:p-4 font-semibold text-gray-700 text-xs lg:text-sm">
                      Status
                    </th>
                    <th className="text-left p-3 lg:p-4 font-semibold text-gray-700 text-xs lg:text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                        <p className="mt-2">Loading...</p>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-500">
                        No spare parts available
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((i, index) => (
                      <tr
                        key={i.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-3 lg:p-4 font-medium text-gray-900 text-xs lg:text-sm">
                          {i.name}
                        </td>

                        <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                            <span className="truncate">{i.source}</span>
                          </div>
                        </td>

                        <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">
                          {i.quantity}
                        </td>
                        <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                          {i.maxQuantity ?? "—"}
                        </td>

                        <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                            {i.location}
                          </div>
                        </td>

                        <td className="p-3 lg:p-4">
                          <StatusBadge status={i.status} />
                        </td>

                        <td className="p-3 lg:p-4">
                          <div className="flex gap-2">
                            {/* EDIT */}
                            <button
                              onClick={() => {
                                setEditId(i.id);
                                setForm({
                                  partName: i.name,
                                  location: i.location,
                                  quantity: i.quantity,
                                  maxQuantity: i.maxQuantity ?? "",
                                });
                                setShowForm(true);
                              }}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Edit"
                            >
                              <Pencil
                                size={14}
                                className="text-gray-600 hover:text-[#c62d23] lg:w-4 lg:h-4"
                              />
                            </button>

                            {/* TRANSFER */}
                            <button
                              onClick={() => {
                                setTransferItem(i);
                                setShowTransfer(true);
                              }}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Transfer Location"
                            >
                              <ArrowLeftRight
                                size={14}
                                className="text-gray-600 hover:text-[#c62d23] lg:w-4 lg:h-4"
                              />
                            </button>

                            {/* DELETE */}
                            <button
                              onClick={() => deletePart(i.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Delete"
                            >
                              <Trash2
                                size={14}
                                className="text-gray-600 hover:text-red-600 lg:w-4 lg:h-4"
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARDS - Mobile/Tablet */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200 text-sm">
                No spare parts available
              </div>
            ) : (
              filteredData.map((i) => (
                <div
                  key={i.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {i.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-2">
                        <Building2 size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{i.source}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                        <span>{i.location}</span>
                      </div>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <p className="text-gray-500 mb-0.5">Quantity</p>
                      <p className="font-bold text-gray-900 text-lg">{i.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">Max Qty</p>
                      <p className="font-semibold text-gray-900">{i.maxQuantity ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setEditId(i.id);
                        setForm({
                          partName: i.name,
                          location: i.location,
                          quantity: i.quantity,
                          maxQuantity: i.maxQuantity ?? "",
                        });
                        setShowForm(true);
                      }}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                      title="Edit"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        setTransferItem(i);
                        setShowTransfer(true);
                      }}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                      title="Transfer"
                    >
                      <ArrowLeftRight size={14} />
                      Transfer
                    </button>

                    <button
                      onClick={() => deletePart(i.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl w-full max-w-md border border-gray-200 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-gray-900">
                {editId ? "Update Spare Part" : "Add Spare Part"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm({ partName: "", location: "", quantity: "", maxQuantity: "" });
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <Input
              label="Spare Part Name"
              value={form.partName}
              onChange={(v) => setForm({ ...form, partName: v })}
              placeholder="Enter part name"
            />

            <Input
              label="Location"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
              placeholder="Enter location"
            />

            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(v) => setForm({ ...form, quantity: v })}
              placeholder="Enter quantity"
            />
            {role === "admin" && (
              <Input
                label="Max Quantity"
                type="number"
                value={form.maxQuantity}
                onChange={(v) => setForm({ ...form, maxQuantity: v })}
                placeholder="Enter max stock level"
              />
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm({ partName: "", location: "", quantity: "", maxQuantity: "" });
                }}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-gray-700 font-medium rounded-lg sm:rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={submitPart}
                className="w-full sm:w-auto bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 sm:px-5 py-2.5 font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                {editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransfer && transferItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl w-full max-w-md border border-gray-200 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="font-bold text-lg sm:text-xl text-gray-900">
                Transfer Location
              </h2>
              <button
                onClick={() => {
                  setShowTransfer(false);
                  setTransfer({ toLocation: "", quantity: "" });
                  setTransferItem(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
              <p className="text-xs sm:text-sm text-gray-600">Part</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">{transferItem.name}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">Current Location</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">
                {transferItem.location}
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  To Location
                </label>
                <select
                  value={transfer.toLocation}
                  onChange={(e) =>
                    setTransfer({ ...transfer, toLocation: e.target.value })
                  }
                  className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                >
                  <option value="">Select Location</option>
                  {locations
                    .filter((loc) => loc !== transferItem.location)
                    .map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                </select>
              </div>

              <Input
                label="Quantity"
                type="number"
                value={transfer.quantity}
                onChange={(v) => setTransfer({ ...transfer, quantity: v })}
                placeholder="Enter quantity to transfer"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTransfer(false);
                  setTransfer({ toLocation: "", quantity: "" });
                  setTransferItem(null);
                }}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-gray-700 font-medium rounded-lg sm:rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={submitTransfer}
                className="w-full sm:w-auto bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 sm:px-5 py-2.5 font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const KpiCard = ({
  title,
  value,
  icon,
  danger = false,
  info = false,
  active = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`cursor-pointer bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full
      ${active ? "ring-2 ring-[#c62d23]" : "border-gray-200"}
    `}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3 sm:mb-4">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 20, className: `sm:w-6 sm:h-6 ${icon.props.className}` })}
    </div>

    <p
      className={`text-2xl sm:text-3xl font-bold mb-1 ${
        danger
          ? "text-red-600"
          : info
          ? "text-blue-600"
          : "text-gray-900"
      }`}
    >
      {value}
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    Healthy: "bg-green-100 text-green-800",
    "Low Stock": "bg-amber-100 text-amber-800",
    Critical: "bg-red-100 text-red-800",
    Overstocked: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${map[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div className="mb-3 sm:mb-4">
    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
    />
  </div>
);