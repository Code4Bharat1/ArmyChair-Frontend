"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [showForm, setShowForm] = useState(false);
  const [warehouseUsers, setWarehouseUsers] = useState([]);
  const [inwards, setInwards] = useState([]);
  const [loading, setLoading] = useState(true);

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

  /* ================= UI ================= */
  return (
    <div className="p-6 max-w-7xl mx-auto text-neutral-100">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Production – Inward Inventory</h1>
          <p className="text-sm text-neutral-400">
            Create and track inward materials
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} />
          Add Inventory
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Inward Inventory</h2>

          <form onSubmit={submitInward} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Date</label>
              <div className="bg-neutral-700 p-2 rounded mt-1">{today}</div>
            </div>

            <input
              name="partName"
              placeholder="Part Name (Seat, Wheel, Gas Lift...)"
              value={form.partName}
              onChange={handleChange}
              className="bg-neutral-700 p-2 rounded"
              required
            />

            <input
              name="quantity"
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={handleChange}
              className="bg-neutral-700 p-2 rounded"
              required
            />

            <select
              name="assignedTo"
              value={form.assignedTo}
              onChange={handleChange}
              className="bg-neutral-700 p-2 rounded"
              required
            >
              <option value="">Assign Warehouse Staff</option>
              {warehouseUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>

            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-neutral-700 rounded"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-amber-600 rounded">
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : inwards.length === 0 ? (
          <div className="p-6 text-center text-neutral-400">
            No inward records found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-neutral-900 border-b border-neutral-700">
              <tr>
                {["Date", "Part Name", "Qty", "Assigned To", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="p-3 text-left text-xs uppercase text-neutral-400"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {inwards.map((i) => (
                <tr
                  key={i._id}
                  className="border-b border-neutral-700 hover:bg-neutral-900"
                >
                  <td className="p-3">
                    {new Date(i.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 font-medium">{i.partName}</td>
                  <td className="p-3">{i.quantity}</td>
                  <td className="p-3">{i.assignedTo?.name}</td>

                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        i.status === "ACCEPTED"
                          ? "bg-green-900/40 text-green-400"
                          : "bg-amber-900/40 text-amber-400"
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
  );
}
