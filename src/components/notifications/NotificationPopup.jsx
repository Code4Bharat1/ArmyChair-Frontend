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
    router.push(`${n.redirectUrl}?highlight=${n.entityId}`);

  };

  return (
    <div className="absolute top-14 right-0 left-2 w-80 z-10 bg-white shadow-xl rounded-xl border border-gray-300 overflow-hidden max-h-[400px] flex flex-col">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-300 font-semibold">
        Notifications
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">
          No notifications
        </p>
      ) : (
        <div className="overflow-y-auto flex-1">
          <ul className="divide-y divide-gray-200">
            {notifications.map((n) => (
              <li
                key={n._id}
                onClick={() => handleClick(n)}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-gray-600">{n.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
