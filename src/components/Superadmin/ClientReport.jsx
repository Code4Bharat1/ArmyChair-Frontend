"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Users, Package, Search, TrendingUp, ChevronDown, ChevronUp, Calendar, ShoppingCart } from "lucide-react";
import Sidebar from "./sidebar";

export default function ClientsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [expandedClient, setExpandedClient] = useState(null);

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
          orderHistory: [],
        };
      }

      map[clientId].products.add(o.chairModel);
      map[clientId].totalOrders += 1;
      map[clientId].totalQty += Number(o.quantity || 0);

      // Add to order history
      map[clientId].orderHistory.push({
        orderId: o._id || o.id,
        product: o.chairModel,
        quantity: Number(o.quantity || 0),
        orderDate: new Date(o.orderDate),
        deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : null,
        status: o.progress || o.status || "N/A",
      });

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
      orderHistory: c.orderHistory.sort((a, b) => b.orderDate - a.orderDate),
    }));
  }, [orders]);

  const allProducts = useMemo(() => {
    return Array.from(new Set(clients.flatMap((c) => c.products)));
  }, [clients]);

  /* ================= MOST PURCHASED PRODUCT ================= */
  const mostPurchasedProduct = useMemo(() => {
    const productCount = {};
    
    clients.forEach((c) => {
      c.orderHistory.forEach((order) => {
        if (!productCount[order.product]) {
          productCount[order.product] = 0;
        }
        productCount[order.product] += order.quantity;
      });
    });

    let maxProduct = null;
    let maxQty = 0;

    Object.entries(productCount).forEach(([product, qty]) => {
      if (qty > maxQty) {
        maxQty = qty;
        maxProduct = product;
      }
    });

    return { product: maxProduct || "N/A", quantity: maxQty };
  }, [clients]);

  /* ================= SEARCH & FILTER ================= */
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();

    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.products.some((p) => p.toLowerCase().includes(q));

      const matchesProduct =
        selectedProduct === "ALL" || 
        c.products.some((p) => p.toLowerCase() === selectedProduct.toLowerCase());

      return matchesSearch && matchesProduct;
    });
  }, [clients, search, selectedProduct]);

  /* ================= STATS ================= */
  const totalClients = filteredClients.length;
  const totalProducts = new Set(filteredClients.flatMap((c) => c.products)).size;

  const toggleExpand = (clientId) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* SIDEBAR */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                  <Users size={40} className="text-[#c62d23]" />
                  Client Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Track and analyze all your clients and their purchase history
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-8">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Clients"
            value={totalClients}
            icon={<Users size={28} />}
            color="bg-[#c62d23]"
          />
          <StatCard
            title="Products Sold"
            value={totalProducts}
            icon={<Package size={28} />}
            color="bg-[#c62d23]"
          />
          <StatCard
            title="Most Purchased"
            value={mostPurchasedProduct.product}
            subtitle={`${mostPurchasedProduct.quantity} units`}
            icon={<TrendingUp size={28} />}
            color="bg-[#c62d23]"
          />
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* SEARCH BAR */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients or products..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* PRODUCT FILTER BUTTONS */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              Filter by Product
            </label>
            <div className="flex flex-wrap gap-3">
              <FilterButton
                active={selectedProduct === "ALL"}
                onClick={() => setSelectedProduct("ALL")}
                label="All Products"
              />
              {allProducts.map((product) => (
                <FilterButton
                  key={product}
                  active={selectedProduct === product}
                  onClick={() => setSelectedProduct(product)}
                  label={product}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CLIENTS TABLE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#c62d23]"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <Users size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold text-gray-900">No clients found</p>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Latest Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Total Orders
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Total Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Last Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <React.Fragment key={client.id}>
                      {/* MAIN ROW */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#c62d23] flex items-center justify-center text-white font-bold">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-900 text-base">
                              {client.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {client.orderHistory.length > 0 ? (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-50 text-[#c62d23] border border-red-200">
                              {client.orderHistory[0].product}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">No orders</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            {client.totalOrders}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            {client.totalQty}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          {client.lastOrderDate
                            ? client.lastOrderDate.toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleExpand(client.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#c62d23] text-white rounded-lg hover:bg-[#a02419] transition-colors font-medium text-sm"
                          >
                            {expandedClient === client.id ? (
                              <>
                                <ChevronUp size={16} />
                                Hide History
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                View History
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED ROW - ORDER HISTORY */}
                      {expandedClient === client.id && (
                        <tr>
                          <td colSpan="6" className="bg-gray-50 px-6 py-6">
                            <div className="border-l-4 border-[#c62d23] pl-6">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <ShoppingCart size={20} className="text-[#c62d23]" />
                                    Purchase History - {client.name}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-2">
                                    <TrendingUp size={16} className="text-[#c62d23]" />
                                    <span className="text-sm text-gray-600">Most Purchased:</span>
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#c62d23] text-white">
                                      {(() => {
                                        const productCount = {};
                                        client.orderHistory.forEach((order) => {
                                          if (!productCount[order.product]) {
                                            productCount[order.product] = 0;
                                          }
                                          productCount[order.product] += order.quantity;
                                        });
                                        const mostPurchased = Object.entries(productCount).sort(
                                          (a, b) => b[1] - a[1]
                                        )[0];
                                        return mostPurchased
                                          ? `${mostPurchased[0]} (${mostPurchased[1]} units)`
                                          : "N/A";
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {client.orderHistory.length === 0 ? (
                                <p className="text-gray-500 italic">No order history available</p>
                              ) : (
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                          Order ID
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                          Product
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                          Quantity
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                          Order Date
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                          Delivery Date
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {client.orderHistory.map((order, idx) => (
                                        <tr
                                          key={order.orderId || idx}
                                          className="hover:bg-gray-50 transition-colors"
                                        >
                                          <td className="px-4 py-3 font-medium text-gray-900">
                                            {order.orderId || "N/A"}
                                          </td>
                                          <td className="px-4 py-3 text-gray-700">
                                            {order.product}
                                          </td>
                                          <td className="px-4 py-3 font-semibold text-gray-900">
                                            {order.quantity}
                                          </td>
                                          <td className="px-4 py-3 text-gray-700">
                                            <div className="flex items-center gap-2">
                                              <Calendar size={14} className="text-gray-400" />
                                              {order.orderDate.toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                              })}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-gray-700">
                                            {order.deliveryDate ? (
                                              <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400" />
                                                {order.deliveryDate.toLocaleDateString("en-IN", {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                                })}
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3">
                                            <StatusBadge status={order.status} />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

/* ================= COMPONENTS ================= */

const StatCard = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white rounded-lg border-l-4 border-[#c62d23] shadow-sm hover:shadow-md transition-all duration-200 p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          {title}
        </p>
      </div>
      <div className={`${color} p-2 rounded-lg`}>
        {React.cloneElement(icon, { className: "text-white", size: 20 })}
      </div>
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

const FilterButton = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
      active
        ? "bg-[#c62d23] text-white shadow-md transform scale-105"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
    }`}
  >
    {label}
  </button>
);

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s.includes("completed") || s.includes("delivered")) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    if (s.includes("progress") || s.includes("production")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (s.includes("delayed")) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    if (s.includes("ready")) {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )}`}
    >
      {status}
    </span>
  );
};