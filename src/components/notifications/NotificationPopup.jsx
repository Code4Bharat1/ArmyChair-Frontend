"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

export default function NotificationPopup({ close }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const popupRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [close]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to load notifications");
    }
  };

  const handleClick = (n) => {
    let realId = n.entityId;
    if (!realId && n._id.includes("-")) {
      const parts = n._id.split("-");
      realId = parts[parts.length - 1];
    }
    const finalUrl = `${n.redirectUrl}?highlight=${realId}`;
    close();
    router.push(finalUrl);
  };

  return (
    <>
      {/* Mobile: full-screen overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 sm:hidden"
        onClick={close}
      />

      {/* Popup */}
      <div
        ref={popupRef}
        className={`
          z-50 bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden

          /* Mobile: bottom sheet style */
          fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[70vh]
          sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-12
          sm:w-80 sm:rounded-xl sm:max-h-[420px]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#c62d23]" />
            <span className="font-semibold text-gray-900 text-sm">
              Notifications
            </span>
            {notifications.length > 0 && (
              <span className="bg-[#c62d23] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-10 text-center px-6">
            <Bell size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              No notifications yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              You're all caught up!
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <li
                  key={n._id}
                  onClick={() => handleClick(n)}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#c62d23] mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}