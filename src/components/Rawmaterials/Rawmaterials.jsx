"use client";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, User, Loader2 } from "lucide-react";
import Sidebar from "../Sidebar/sidebar";

export default function RawMaterials() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [rawMaterialsData, setRawMaterialsData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= AUTH ================= */
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  /* ================= UI STATE ================= */
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState(null); // success / error

  /* ================= FORM ================= */
  const [formData, setFormData] = useState({
    productName: "",
    type: "",
    colour: "",
    setNo: "",
    company: "",
  });

  /* ================= FETCH ================= */
  const fetchRawMaterials = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/raw`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data)
        ? res.data
        : res.data.rawMaterials || [];

      setRawMaterialsData(data);
    } catch (error) {
      console.error("Fetch error", error);
      setRawMaterialsData([]);
      setMessage({ type: "error", text: "Failed to load raw materials" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRawMaterials();
  }, [token]);

  /* ================= SEARCH FILTER ================= */
  const filteredData = useMemo(() => {
    if (!search) return rawMaterialsData;

    return rawMaterialsData.filter((item) =>
      [item.productName, item.company, item.type, item.colour]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search, rawMaterialsData]);

  /* ================= FORM ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      productName: "",
      type: "",
      colour: "",
      setNo: "",
      company: "",
    });
  };

  /* ================= ADD / UPDATE ================= */
  const saveRawMaterial = async () => {
    const { productName, type, colour, setNo, company } = formData;

    if (!productName || !type || !colour || !setNo || !company) {
      setMessage({ type: "error", text: "All fields are required" });
      return;
    }

    try {
      if (editId) {
        await axios.patch(
          `${API_URL}/raw/update/${editId}`,
          { productName, type, colour, setNo: Number(setNo), company },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage({ type: "success", text: "Raw material updated" });
      } else {
        await axios.post(
          `${API_URL}/raw`,
          { productName, type, colour, setNo: Number(setNo), company },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage({ type: "success", text: "Raw material added" });
      }

      setShowModal(false);
      resetForm();
      fetchRawMaterials();
    } catch (error) {
      console.error("Save error", error);
      setMessage({ type: "error", text: "Failed to save record" });
    }
  };

  /* ================= DELETE ================= */
  const deleteRawMaterial = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      await axios.delete(`${API_URL}/raw/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: "success", text: "Record deleted" });
      fetchRawMaterials();
    } catch (error) {
      console.error("Delete error", error);
      setMessage({ type: "error", text: "Delete failed" });
    }
  };

  /* ================= EDIT ================= */
  const editRawMaterial = (item) => {
    setEditId(item._id);
    setFormData({
      productName: item.productName,
      type: item.type,
      colour: item.colour,
      setNo: item.setNo,
      company: item.company,
    });
    setShowModal(true);
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* ================= HEADER ================= */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
          <div className="relative max-w-xl w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, company, type..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
            <span className="text-sm text-neutral-300">Admin User</span>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Raw Materials</h1>
              <p className="text-sm text-neutral-400">
                Track raw material products, suppliers, and batch details.
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-amber-600 hover:bg-amber-500 transition px-4 py-2 rounded-lg text-sm w-fit"
            >
              Add Inventory
            </button>
          </div>

          {/* ================= ALERT ================= */}
          {message && (
            <div
              className={`mb-4 text-sm px-4 py-2 rounded-lg ${
                message.type === "success"
                  ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700"
                  : "bg-red-900/40 text-red-300 border border-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* ================= TABLE ================= */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-850">
                  {[
                    "Product",
                    "Type",
                    "Set No.",
                    "Company",
                    "Received Date",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="p-4 text-xs text-neutral-400 uppercase text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400">
                      <Loader2 className="animate-spin inline mr-2" size={16} />
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredData.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-neutral-700 hover:bg-neutral-750"
                    >
                      <td className="p-4">
                        <div>{item.productName}</div>
                        <div className="text-xs text-neutral-500">
                          {item.colour}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{item.type}</td>
                      <td className="p-4 text-sm">{item.setNo}</td>
                      <td className="p-4 text-sm">{item.company}</td>
                      <td className="p-4 text-sm">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 flex gap-3">
                        <button
                          onClick={() => editRawMaterial(item)}
                          className="text-amber-500 hover:underline text-sm"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => deleteRawMaterial(item._id)}
                          className="text-red-500 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {!loading && filteredData.length === 0 && (
              <div className="p-10 text-center text-neutral-400">
                No raw material records found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editId ? "Update Raw Material" : "Add Raw Material"}
            </h2>

            <div className="space-y-3">
              {[
                { name: "productName", label: "Product Name" },
                { name: "type", label: "Type" },
                { name: "colour", label: "Colour" },
                { name: "setNo", label: "Set No" },
                { name: "company", label: "Company" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="text-xs text-neutral-400">
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    value={formData[f.name]}
                    onChange={handleChange}
                    className="mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-600 outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveRawMaterial}
                className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
