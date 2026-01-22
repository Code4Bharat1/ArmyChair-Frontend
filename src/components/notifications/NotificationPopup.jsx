"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function NotificationPopup({ close }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

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
    close();
    router.push(n.redirectUrl);
  };

  return (
    <div className="absolute top-15 right-0 left-0 w-86 bg-white shadow-xl rounded-xl shadow-gray-200 border-2 border-gray-300 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-300 font-semibold">
        Notifications
      </div>

      {notifications.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">
          No notifications
        </p>
      ) : (
        <ul className="divide-y-1 divide-gray-200 ">
          {notifications.map((n) => (
            <li
              key={n._id}
              onClick={() => handleClick(n)}
              className="px-4 py-3 cursor-pointer hover:bg-gray-50"
            >
              {/* ✅ REAL BACKEND DATA */}
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-gray-600">{n.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
