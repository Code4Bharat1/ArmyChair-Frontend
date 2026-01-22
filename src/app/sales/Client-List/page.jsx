"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Users, Package, Search, Filter } from "lucide-react";

export default function ClientsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("ALL");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ORDERS ================= */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API}/orders`, { headers });
        setOrders(res.data.orders || res.data);
      } catch (err) {
        console.error("Fetch orders failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  /* ================= AGGREGATE CLIENTS ================= */
  const clients = useMemo(() => {
    const map = {};

    orders.forEach((o) => {
      const isObject = o.dispatchedTo && typeof o.dispatchedTo === "object";

      const clientId = isObject ? o.dispatchedTo._id : o.dispatchedTo;
      const clientName = isObject ? o.dispatchedTo.name : o.dispatchedTo;

      if (!clientName) return;

      if (!map[clientId]) {
        map[clientId] = {
          id: clientId,
          name: clientName,
          products: new Set(),
          totalOrders: 0,
          totalQty: 0,
          lastOrderDate: null,
        };
      }

      map[clientId].products.add(o.chairModel);
      map[clientId].totalOrders += 1;
      map[clientId].totalQty += Number(o.quantity || 0);

      const orderDate = new Date(o.orderDate);
      if (
        !map[clientId].lastOrderDate ||
        orderDate > map[clientId].lastOrderDate
      ) {
        map[clientId].lastOrderDate = orderDate;
      }
    });

    return Object.values(map).map((c) => ({
      ...c,
      products: Array.from(c.products),
    }));
  }, [orders]);

  const allProducts = useMemo(() => {
    return Array.from(new Set(clients.flatMap((c) => c.products)));
  }, [clients]);

  /* ================= SEARCH ================= */
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();

    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.products.some((p) => p.toLowerCase().includes(q));

      const matchesProduct =
        selectedProduct === "ALL" || c.products.includes(selectedProduct);

      return matchesSearch && matchesProduct;
    });
  }, [clients, search, selectedProduct]);

  /* ================= STATS ================= */
  const totalClients = filteredClients.length;
  const totalProducts = new Set(filteredClients.flatMap((c) => c.products))
    .size;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={32} className="text-[#c62d23]" />
              <span>Client List</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              All clients and the products they purchase
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title="Total Clients" value={totalClients} icon={<Users className="text-[#c62d23]" />} />
            <StatCard title="Products Sold" value={totalProducts} icon={<Package className="text-[#c62d23]" />} />
          </div>

          {/* FILTERS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>

            {/* SEARCH */}
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
              <Search size={16} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients or products..."
                className="bg-transparent outline-none text-sm w-full text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* PRODUCT FILTERS */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Filter by Product</label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedProduct("ALL")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedProduct === "ALL"
                      ? "bg-[#c62d23] text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                >
                  All Products
                </button>

                {allProducts.map((product) => (
                  <button
                    key={product}
                    onClick={() => setSelectedProduct(product)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedProduct === product
                        ? "bg-[#c62d23] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                      }`}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No clients found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Client",
                        "Products Purchased",
                        "Total Orders",
                        "Total Quantity",
                        "Last Order",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-4 text-left font-semibold text-gray-700"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredClients.map((c, index) => (
                      <tr
                        key={c.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                      >
                        <td className="p-4 font-semibold text-gray-900">{c.name}</td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {c.products.map((p) => (
                              <span
                                key={p}
                                className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-4 font-semibold text-gray-900">{c.totalOrders}</td>
                        <td className="p-4 font-semibold text-gray-900">{c.totalQty}</td>
                        <td className="p-4 text-gray-700">
                          {c.lastOrderDate
                            ? c.lastOrderDate.toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENT ================= */

const StatCard = ({ title, value, icon }) => (
  <div
    className="bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200 hover:border-[#c62d23]"
    style={{
      borderLeft: "4px solid #c62d23",
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
  </div>
);
