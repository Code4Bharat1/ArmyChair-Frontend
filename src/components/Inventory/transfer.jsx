"use client";
import { formatDate } from "@/utils/formatDate";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Package,
  User,
  Clock,
  MapPin,
  ArrowRightLeft,
  TrendingUp,
  X,
  AlertCircle,
  Menu,
  UserCircle,
} from "lucide-react";
import InventorySidebar from "./sidebar";
import { useRouter } from "next/navigation";

export default function StockMovementsPage() {
  const router = useRouter();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([
    { sourceId: "", quantity: "" },
  ]);

  const [toLocation, setToLocation] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  /* FILTERS */
  const [search, setSearch] = useState("");
  const [fromFilter, setFromFilter] = useState("All");
  const [toFilter, setToFilter] = useState("All");
  const [activeStatFilter, setActiveStatFilter] = useState("ALL");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchMovements = async () => {
    try {
      const res = await axios.get(`${API}/transfer/stock-movement`, {
        headers,
      });
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error("Fetch movements failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });
      setInventoryList(res.data.inventory || []);
    } catch (err) {
      console.error("Inventory fetch failed");
    }
  };
  useEffect(() => {
    fetchMovements();
    fetchInventory();
  }, []);

  const addRow = () => {
    const lastRow = selectedItems[selectedItems.length - 1];

    // Check empty
    if (!lastRow.sourceId || !lastRow.quantity) {
      alert("Please fill current product before adding another.");
      return;
    }

    // Prevent duplicate product selection
    const duplicate = selectedItems.filter(
      (item) => item.sourceId === lastRow.sourceId
    );

    if (duplicate.length > 1) {
      alert("This product is already added.");
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      { sourceId: "", quantity: "" },
    ]);
  };

  const removeRow = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleTransfer = async () => {
    if (!toLocation) return alert("Select destination");

    if (selectedItems.length === 0) return alert("Add at least one item");

    try {
      setTransferLoading(true);

      for (const item of selectedItems) {
        if (!item.sourceId || !item.quantity)
          return alert("All rows must be filled");

        const sourceItem = inventoryList.find((i) => i._id === item.sourceId);

        if (!sourceItem) return alert("Invalid source selected");

        if (Number(item.quantity) > sourceItem.quantity)
          return alert(
            `Quantity exceeds stock for ${sourceItem.partName || sourceItem.chairType}`,
          );

        if (sourceItem.location === toLocation)
          return alert("Source and destination cannot be same");

        await axios.post(
          `${API}/transfer`,
          {
            sourceId: item.sourceId,
            toLocation,
            quantity: item.quantity,
          },
          { headers },
        );
      }

      alert("Transfer successful");

      setSelectedItems([{ sourceId: "", quantity: "" }]);
      setToLocation("");
      setTransferModalOpen(false);

      fetchInventory();
      fetchMovements();
    } catch (err) {
      alert(err.response?.data?.message || "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  /* ================= NORMALIZE ================= */
  const normalized = useMemo(() => {
    return movements.map((m) => ({
      id: m._id,
      part: m.partName || m.chairType,
      from: m.fromLocation,
      to: m.toLocation,
      qty: m.quantity || 0,
      user: m.movedBy?.name || "Unknown",
      time: m.createdAt,
    }));
  }, [movements]);

  /* ================= LOCATIONS ================= */
  const locations = useMemo(() => {
    const set = new Set();
    normalized.forEach((m) => {
      set.add(m.from);
      set.add(m.to);
    });
    return Array.from(set);
  }, [normalized]);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    let data = normalized.filter((m) => {
      const matchSearch =
        (m.part ?? "").toLowerCase().includes(q) ||
        (m.from ?? "").toLowerCase().includes(q) ||
        (m.to ?? "").toLowerCase().includes(q) ||
        (m.user ?? "").toLowerCase().includes(q);

      const matchFrom = fromFilter === "All" || m.from === fromFilter;
      const matchTo = toFilter === "All" || m.to === toFilter;

      return matchSearch && matchFrom && matchTo;
    });

    // Apply stat filter
    if (activeStatFilter === "TODAY") {
      data = data.filter((m) => {
        const d = new Date(m.time);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      });
    }

    return data;
  }, [normalized, search, fromFilter, toFilter, activeStatFilter]);

  /* ================= STATS ================= */
  const totalMovements = normalized.length;
  const totalQty = normalized.reduce((s, m) => s + m.qty, 0);

  const todayCount = normalized.filter((m) => {
    const d = new Date(m.time);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

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

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <Menu size={24} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
                  <ArrowRightLeft
                    size={24}
                    className="text-[#c62d23] sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0"
                  />
                  <span className="truncate">Stock Movement History</span>
                </h1>
                <p className="text-sm text-gray-600 mt-1 hidden sm:block">
                  Track all inventory transfers between locations
                </p>
              </div>
            </div>
            <button
              onClick={() => setTransferModalOpen(true)}
              className="bg-[#c62d23] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#a82419] transition"
            >
              + Add Transfer
            </button>

            <button
              onClick={() => router.push("/profile")}
              title="My Profile"
              className="text-gray-600 hover:text-[#c62d23] transition flex-shrink-0"
            >
              <UserCircle size={28} className="sm:w-8 sm:h-8 md:w-9 md:h-9" />
            </button>
          </div>
        </div>

        {/* TRANSFER MODAL */}
        {transferModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-[#c62d23]" />
                  Transfer Stock
                </h2>
                <button 
                  onClick={() => setTransferModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Products Table */}
              <div>
                <label className="text-sm font-medium mb-2 block">Products</label>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700">Product</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-700">Available</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-700">Qty</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedItems.map((row, index) => {
                        const item = inventoryList.find(
                          (i) => i._id === row.sourceId
                        );

                        return (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="p-2">
                              <select
                                value={row.sourceId}
                                onChange={(e) =>
                                  updateItem(index, "sourceId", e.target.value)
                                }
                                className="w-full border border-gray-200 px-3 py-2 rounded-lg focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none"
                              >
                                <option value="">Select Product</option>
                                {inventoryList
                                  .filter(
                                    (item) =>
                                      item.quantity > 0 &&
                                      !item.location.startsWith("PROD_")
                                  )
                                  .map((item) => (
                                    <option key={item._id} value={item._id}>
                                      {item.partName || item.chairType} — {item.location}
                                    </option>
                                  ))}
                              </select>
                            </td>

                            <td className="p-2 text-center text-gray-600 font-medium">
                              {item?.quantity || "-"}
                            </td>

                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) =>
                                  updateItem(index, "quantity", e.target.value)
                                }
                                className="w-20 border border-gray-200 px-3 py-2 rounded-lg text-center focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none"
                              />
                            </td>

                            <td className="p-2 text-center">
                              {selectedItems.length > 1 && (
                                <button
                                  onClick={() => removeRow(index)}
                                  className="text-sm text-gray-400 hover:text-red-500 transition font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={addRow}
                  disabled={
                    !selectedItems[selectedItems.length - 1].sourceId ||
                    !selectedItems[selectedItems.length - 1].quantity
                  }
                  className={`mt-3 text-sm font-medium ${
                    !selectedItems[selectedItems.length - 1].sourceId ||
                    !selectedItems[selectedItems.length - 1].quantity
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#c62d23] hover:text-[#a82419]"
                  }`}
                >
                  + Add Product
                </button>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Destination</label>
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none"
                >
                  <option value="">Select Destination</option>

                  {Array.from(
                    new Set([
                      ...inventoryList.map((item) => item.location),
                      "PROD_Mintoo",
                      "PROD_Sajid",
                      "PROD_Jamshed",
                      "PROD_Ehtram",
                    ]),
                  ).map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <button
                onClick={handleTransfer}
                disabled={transferLoading}
                className="w-full bg-[#c62d23] text-white py-3 rounded-xl font-medium hover:bg-[#a82419] transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {transferLoading ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        )}

        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <StatCard
              title="Total Movements"
              value={totalMovements}
              icon={<ArrowRightLeft className="text-[#c62d23]" />}
              clickable={true}
              active={activeStatFilter === "ALL"}
              onClick={() => setActiveStatFilter("ALL")}
            />
            <StatCard
              title="Total Qty Moved"
              value={totalQty}
              icon={<TrendingUp className="text-[#c62d23]" />}
              clickable={false}
            />
            <StatCard
              title="Today"
              value={todayCount}
              icon={<Clock className="text-[#c62d23]" />}
              clickable={true}
              active={activeStatFilter === "TODAY"}
              onClick={() => setActiveStatFilter("TODAY")}
            />
          </div>

          {/* FILTER BADGE */}
          {activeStatFilter !== "ALL" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                <AlertCircle
                  className="text-amber-700 flex-shrink-0"
                  size={16}
                />
                <span className="text-sm font-medium text-amber-800">
                  Showing only today's movements
                </span>
              </div>
              <button
                onClick={() => setActiveStatFilter("ALL")}
                className="text-sm text-gray-600 hover:text-[#c62d23] font-medium transition"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* FILTERS */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part, location or user..."
              className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
            />

            <select
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl outline-none text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
            >
              <option value="All">From (All)</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl outline-none text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
            >
              <option value="All">To (All)</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch("");
                setFromFilter("All");
                setToFilter("All");
                setActiveStatFilter("ALL");
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2.5 font-medium transition-all"
            >
              Reset All Filters
            </button>
          </div>

          {/* TABLE - Desktop */}
          <div className="hidden md:block bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No stock movements found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Part
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        From
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        To
                      </th>
                      <th className="p-4 text-center font-semibold text-gray-700">
                        Qty
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Moved By
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Time
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((m, index) => (
                      <tr
                        key={m.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900">
                              {m.part}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                            {m.from}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                            {m.to}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span className="font-semibold text-[#c62d23]">
                            {m.qty}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <User size={16} className="text-gray-400 flex-shrink-0" />
                            {m.user}
                          </div>
                        </td>

                        <td className="p-4 text-gray-700">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400 flex-shrink-0" />
                            {formatDate(m.time)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARDS - Mobile/Tablet */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
                <Package size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-base font-medium">
                  No stock movements found
                </p>
              </div>
            ) : (
              filtered.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Package size={14} className="text-gray-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {m.part}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{m.user}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div className="bg-[#c62d23] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {m.qty}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <p className="text-gray-500 mb-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        From
                      </p>
                      <p className="font-medium text-gray-900">{m.from}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        To
                      </p>
                      <p className="font-medium text-gray-900">{m.to}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock size={12} className="text-gray-400 flex-shrink-0" />
                      {formatDate(m.time)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, clickable, active, onClick }) => (
  <div
    onClick={clickable ? onClick : undefined}
    className={`bg-white border-l-4 border-[#c62d23] rounded-xl p-5 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full ${
      clickable ? "cursor-pointer hover:bg-gray-50" : ""
    } ${active ? "ring-2 ring-[#c62d23]" : ""}`}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, {
        size: 24,
        className: icon.props.className,
      })}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {clickable && (
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
        <span>{active ? "Click to show all" : "Click to view details"}</span>
        <span className="text-[#c62d23]">→</span>
      </div>
    )}
  </div>
);