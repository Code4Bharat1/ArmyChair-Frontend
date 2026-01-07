"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search, User } from "lucide-react";
import Sidebar from "../Sidebar/sidebar";

export default function RawMaterials() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [rawMaterialsData, setRawMaterialsData] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal + form state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

const [token, setToken] = useState(null);

useEffect(() => {
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
  }
}, []);


  const [formData, setFormData] = useState({
    ProductName: "",
    type: "",
    colour: "",
    setNo: "",
    company: "",
  });

  /* ================= FETCH ================= */
  const fetchRawMaterials = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/raw`,
        { headers: { Authorization: `Bearer ${token}` }}
      )

      const data = Array.isArray(res.data)
        ? res.data
        : res.data.rawMaterials || [];

      setRawMaterialsData(data);
    } catch (error) {
      console.error("Fetch error", error);
      setRawMaterialsData([]);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  if (token) {
    fetchRawMaterials();
  }
}, [token]);


  /* ================= FORM ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= ADD / UPDATE ================= */
  const saveRawMaterial = async () => {
    const { ProductName, type, colour, setNo, company } = formData;

    if (!ProductName || !type || !colour || !setNo || !company) {
      alert("All fields are required");
      return;
    }

    try {
      if (editId) {
        // UPDATE
        await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/raw/update/${editId}`, {
          ProductName,
          type,
          colour,
          setNo: Number(setNo),
          company,
        },{ headers: { Authorization: `Bearer ${token}` }});
      } else {
        // CREATE
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/raw`,{
          ProductName,
          type,
          colour,
          setNo: Number(setNo),
          company,
        },{ headers: { Authorization: `Bearer ${token}` }});
      }

      setShowModal(false);
      setEditId(null);
      setFormData({
        ProductName: "",
        type: "",
        colour: "",
        setNo: "",
        company: "",
      });

      fetchRawMaterials();
    } catch (error) {
      console.error("Save error", error);
    }
  };

  /* ================= DELETE ================= */
  const deleteRawMaterial = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/raw/delete/${id}`,
        {headers : { Authorization: `Bearer ${token}`}}
      )
      
      fetchRawMaterials();
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  /* ================= EDIT ================= */
  const editRawMaterial = (item) => {
    setEditId(item._id);
    setFormData({
      ProductName: item.ProductName,
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
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex justify-between">
          <div className="relative max-w-2xl flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              placeholder="Search raw materials or company..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
            <span className="text-sm text-neutral-300">Admin User</span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <div className="flex justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Raw Materials</h1>
              <p className="text-sm text-neutral-400">
                Track raw material products, suppliers, and batch details.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchRawMaterials}
                className="bg-neutral-700 px-4 py-2 rounded-lg text-sm"
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  setEditId(null);
                  setShowModal(true);
                }}
                className="bg-amber-600 px-4 py-2 rounded-lg text-sm"
              >
                Add Inventory
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-neutral-700">
              <h2 className="text-lg font-semibold">Raw Material Records</h2>
            </div>

            <table className="w-full">
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
                      className="p-4 text-xs text-neutral-400 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rawMaterialsData.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-neutral-700 hover:bg-neutral-750"
                  >
                    <td className="p-4">
                      <div className="text-white">{item.ProductName}</div>
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
                        className="text-amber-500 text-sm"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => deleteRawMaterial(item._id)}
                        className="text-red-500 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && rawMaterialsData.length === 0 && (
              <div className="p-10 text-center text-neutral-400">
                No raw material records found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editId ? "Update Raw Material" : "Add Raw Material"}
            </h2>

            <div className="space-y-3">
              {["ProductName", "type", "colour", "setNo", "company"].map(
                (field) => (
                  <input
                    key={field}
                    name={field}
                    value={formData[field]}
                    onChange={handleChange}
                    placeholder={field}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                  />
                )
              )}
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
                className="bg-amber-600 px-4 py-2 rounded-lg text-sm"
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
