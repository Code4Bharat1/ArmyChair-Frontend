  "use client";
  import React, { useEffect, useMemo, useState } from "react";
  import { Search, User, AlertCircle, Plus, Trash2, Pencil } from "lucide-react";
  import Sidebar from "../Sidebar/sidebar";
  import axios from "axios";

  export default function InventoryPage() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterVendor, setFilterVendor] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");

    /* MODAL STATE */
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ chairType: "", quantity: "" });

    const API = process.env.NEXT_PUBLIC_API_URL;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    /* ================= FETCH ================= */
    const fetchInventory = async () => {
      try {
        const res = await axios.get(`${API}/inventory`, { headers });
        setInventory(res.data.inventory || res.data);
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchInventory();
    }, []);

    /* ================= CREATE / UPDATE ================= */
    const submitInventory = async () => {
      try {
        if (!form.chairType || form.quantity === "") {
          return alert("All fields required");
        }

        if (editId) {
          await axios.patch(`${API}/inventory/update/${editId}`, form, { headers });
        } else {
          await axios.post(`${API}/inventory`, form, { headers });
        }

        setShowForm(false);
        setForm({ chairType: "", quantity: "" });
        setEditId(null);
        fetchInventory();
      } catch (err) {
        console.error("Save failed", err);
      }
    };

    /* ================= DELETE ================= */
    const deleteInventory = async (id) => {
      if (!confirm("Delete this inventory item?")) return;
      try {
        await axios.delete(`${API}/inventory/delete/${id}`, { headers });
        fetchInventory();
      } catch (err) {
        console.error("Delete failed", err);
      }
    };

    /* ================= TRANSFORM ================= */
    const inventoryData = useMemo(() => {
      return inventory.map((item) => {
        let status = "Healthy";
        if (item.quantity === 0) status = "Critical";
        else if (item.quantity < 100) status = "Low Stock";

        return {
          id: item._id,
          name: item.chairType,
          vendor: item.createdByRole || "Internal",
          noStock: 100,
          quantity: item.quantity,
          status,
          lastUpdated: new Date(item.updatedAt).toLocaleString(),
        };
      });
    }, [inventory]);

    const filteredData = inventoryData.filter((i) => {
      return (
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterVendor === "All" || i.vendor === filterVendor) &&
        (filterStatus === "All" || i.status === filterStatus)
      );
    });

    const totalCount = inventoryData.reduce((s, i) => s + i.quantity, 0);
    const spareParts = inventoryData.length;
    const lowStockCount = inventoryData.filter(
      (i) => i.status !== "Healthy"
    ).length;

    const vendors = ["All", ...new Set(inventoryData.map((i) => i.vendor))];
    const statuses = ["All", "Healthy", "Low Stock", "Critical"];

    /* ================= UI ================= */
    return (
      <div className="flex h-screen bg-neutral-900 text-neutral-100">
        <Sidebar />

        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-between mb-4">
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <button
              onClick={() => setShowForm(true)}
              className="bg-amber-600 px-4 py-2 rounded-lg flex gap-2"
            >
              <Plus size={16} /> Add Inventory
            </button>
          </div>

          {/* ALERT */}
          {lowStockCount > 0 && (
            <div className="bg-amber-950 border border-amber-800 p-4 mb-4 flex gap-3">
              <AlertCircle className="text-amber-400" />
              {lowStockCount} items are low or critical
            </div>
          )}

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-850">
                  <tr>
                    {["Product", "Vendor", "Qty", "Status", "Actions"].map((h) => (
                      <th key={h} className="p-4 text-left text-xs text-neutral-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((i) => (
                    <tr key={i.id} className="border-b border-neutral-700">
                      <td className="p-4">{i.name}</td>
                      <td className="p-4">{i.vendor}</td>
                      <td className="p-4">{i.quantity}</td>
                      <td className="p-4">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="p-4 flex gap-2">
                        <button
                          onClick={() => {
                            setEditId(i.id);
                            setForm({
                              chairType: i.name,
                              quantity: i.quantity,
                            });
                            setShowForm(true);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => deleteInventory(i.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* MODAL */}
          {showForm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
              <div className="bg-neutral-900 p-6 rounded-lg w-96">
                <h2 className="text-lg mb-4">
                  {editId ? "Update Inventory" : "Add Inventory"}
                </h2>

                <input
                  placeholder="Chair Type"
                  value={form.chairType}
                  onChange={(e) =>
                    setForm({ ...form, chairType: e.target.value })
                  }
                  className="w-full mb-3 p-2 bg-neutral-800 rounded"
                />

                <input
                  type="number"
                  placeholder="Quantity"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  className="w-full mb-4 p-2 bg-neutral-800 rounded"
                />

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)}>Cancel</button>
                  <button
                    onClick={submitInventory}
                    className="bg-amber-600 px-4 py-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================= COMPONENT ================= */
  const StatusBadge = ({ status }) => {
    const map = {
      Healthy: "bg-green-900 text-green-300",
      "Low Stock": "bg-amber-900 text-amber-300",
      Critical: "bg-red-900 text-red-300",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${map[status]}`}>
        {status}
      </span>
    );
  };
