"use client";
import React from "react"
import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Package, Clock, CheckCircle, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [showForm, setShowForm] = useState(false);
  const [warehouseUsers, setWarehouseUsers] = useState([]);
  const [inwards, setInwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL"); // Filter state

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    partName: "",
    quantity: "",
    assignedTo: "",
  });

  /* ================= AUTH ================= */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "production") {
      router.push("/login");
    }
  }, [router]);

  /* ================= FETCH WAREHOUSE STAFF ================= */
  useEffect(() => {
    const fetchWarehouseUsers = async () => {
      try {
        const res = await axios.get(`${API}/auth/staff`);
        setWarehouseUsers(res.data.filter((u) => u.role === "warehouse"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchWarehouseUsers();
  }, [API]);

  /* ================= FETCH PRODUCTION INWARD ================= */
  const fetchInwards = async () => {
    try {
      const res = await axios.get(`${API}/production/inward`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setInwards(res.data.data || []);
    } catch (err) {
      console.error("Fetch inwards failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInwards();
  }, []);

  /* ================= FORM HANDLER ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const submitInward = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/production/inward`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      alert("Inventory submitted for warehouse approval");

      setForm({
        partName: "",
        quantity: "",
        assignedTo: "",
      });

      setShowForm(false);
      fetchInwards();
    } catch (err) {
      alert(err.response?.data?.message || "Submit failed");
    }
  };

  /* ================= FILTERED DATA ================= */
  const filteredInwards = inwards.filter((i) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING") return i.status === "PENDING";
    if (statusFilter === "ACCEPTED") return i.status === "ACCEPTED";
    return true;
  });

  /* ================= STATS ================= */
  const totalInwards = inwards.length;
  const pendingApproval = inwards.filter((i) => i.status === "PENDING").length;
  const accepted = inwards.filter((i) => i.status === "ACCEPTED").length;

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      {/* <div className="bg-white/80 backdrop-blur border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Production – Inward Inventory
            </h1>
            <p className="text-sm text-gray-600">
              Create and track inward materials
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c62d23] text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm hover:bg-[#a82419]"
          >
            <Plus size={16} />
            Add Inventory
          </button>
        </div>
      </div> */}
 <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            {/* LEFT SIDE */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={32} className="text-[#c62d23]" />
                <span>Production – Inward Inventory</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
               Create and track inward materials
              </p>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-4">
              <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c62d23] text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm hover:bg-[#a82419]"
          >
            <Plus size={16} />
            Add Inventory
          </button>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition"
              >
                <UserCircle size={34} />
              </button>
            </div>
          </div>
        </div>
      <div className="p-8 space-y-6">
        {/* STATS - CLICKABLE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Inwards"
            value={totalInwards}
            icon={<Package className="text-[#c62d23]" />}
            onClick={() => setStatusFilter("ALL")}
            active={statusFilter === "ALL"}
          />
          <StatCard
            title="Pending Approval"
            value={pendingApproval}
            icon={<Clock className="text-[#c62d23]" />}
            onClick={() => setStatusFilter("PENDING")}
            active={statusFilter === "PENDING"}
          />
          <StatCard
            title="Accepted"
            value={accepted}
            icon={<CheckCircle className="text-[#c62d23]" />}
            onClick={() => setStatusFilter("ACCEPTED")}
            active={statusFilter === "ACCEPTED"}
          />
        </div>

        {/* FORM */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-2xl w-full max-w-[540px] shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Add Inward Inventory
              </h2>

              <form onSubmit={submitInward} className="space-y-5">
                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Date
                  </label>
                  <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed">
                    {today}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Part Name
                  </label>
                  <input
                    name="partName"
                    placeholder="Part Name (Seat, Wheel, Gas Lift...)"
                    value={form.partName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] transition-all text-gray-900 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Quantity
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    placeholder="Quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] transition-all text-gray-900 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Assign Warehouse Staff
                  </label>
                  <select
                    name="assignedTo"
                    value={form.assignedTo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] text-gray-900 shadow-sm"
                    required
                  >
                    <option value="">Assign Warehouse Staff</option>
                    {warehouseUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium border-2 border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#c62d23] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium hover:bg-[#a82419]"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TABLE - FILTERED */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c62d23] border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading...</p>
            </div>
          ) : filteredInwards.length === 0 ? (
            <div className="text-center text-gray-400 py-20">
              <Package size={56} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">
                No inward records found
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {statusFilter === "ALL" 
                  ? "Click 'Add Inventory' to create your first record"
                  : `No ${statusFilter.toLowerCase()} records found`
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Date", "Part Name", "Qty", "Assigned To", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="p-4 text-left text-xs uppercase text-gray-700 font-semibold tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredInwards.map((i) => (
                  <tr
                    key={i._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4 text-gray-600 text-sm">
                      {new Date(i.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-semibold text-gray-900 text-sm">
                      {i.partName}
                    </td>
                    <td className="p-4 text-gray-700 text-sm font-medium">
                      {i.quantity}
                    </td>
                    <td className="p-4 text-gray-700 text-sm">
                      {i.assignedTo?.name}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          i.status === "ACCEPTED"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {i.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD - CLICKABLE ================= */
const StatCard = ({ title, value, icon, onClick, active }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${
      active
        ? "bg-white border-2 border-[#c62d23]"
        : "bg-white border border-gray-200 hover:border-[#c62d23]"
    }`}
    style={active ? { borderLeft: '4px solid #c62d23' } : { borderLeft: '4px solid #c62d23' }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
      <span>Click to filter</span>
      <span className="text-[#c62d23]">→</span>
    </div>
  </div>
);