"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Users, Package } from "lucide-react";
import SalesSidebar from "@/components/Sales/sidebar"; // sales sidebar

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
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <SalesSidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4">
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-neutral-400">
            All clients and the products they purchase
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* PRODUCT FILTERS */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedProduct("ALL")}
              className={`px-4 py-2 rounded-full text-sm border transition
      ${
        selectedProduct === "ALL"
          ? "bg-amber-600 border-amber-500 text-black"
          : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-amber-500"
      }
    `}
            >
              All Products
            </button>

            {allProducts.map((product) => (
              <button
                key={product}
                onClick={() => setSelectedProduct(product)}
                className={`px-4 py-2 rounded-full text-sm border transition
        ${
          selectedProduct === product
            ? "bg-amber-600 border-amber-500 text-black"
            : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-amber-500"
        }
      `}
              >
                {product}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients or products..."
            className="w-full bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg outline-none focus:border-amber-600"
          />

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center text-neutral-400 py-10">
                No clients found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    {[
                      "Client",
                      "Products Purchased",
                      "Total Orders",
                      "Total Quantity",
                      "Last Order",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-4 text-left text-xs text-neutral-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredClients.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-neutral-700 hover:bg-neutral-850 transition"
                    >
                      <td className="p-4 font-medium">{c.name}</td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {c.products.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-1 text-xs rounded-full bg-amber-900/40 text-amber-400 border border-amber-700"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-4">{c.totalOrders}</td>
                      <td className="p-4">{c.totalQty}</td>
                      <td className="p-4">
                        {c.lastOrderDate
                          ? c.lastOrderDate.toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENT ================= */

const StatCard = ({ title, value, icon }) => (
  <div className="p-5 rounded-xl border bg-neutral-800 border-neutral-700">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);
