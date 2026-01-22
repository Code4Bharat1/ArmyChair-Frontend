"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import axios from "axios";
import NotificationPopup from "./NotificationPopup";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchUnread();
  }, []);

  const fetchUnread = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUnread(res.data.count || 0);
    } catch (err) {
      console.error("Unread count failed");
    }
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-12 h-12 rounded-full bg-red-800 text-white shadow-lg flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />

        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && <NotificationPopup close={() => setOpen(false)} />}
    </div>
  );
}
