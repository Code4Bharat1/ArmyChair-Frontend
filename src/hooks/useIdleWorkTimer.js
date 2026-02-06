"use client";
import { useEffect, useRef } from "react";
import axios from "axios";

export default function useIdleWorkTimer() {
   const moduleName = "STAFF_PANEL";
  const tickRef = useRef(null);
  const idleRef = useRef(null);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL;
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

 const start = async () => {
  await axios.post(
    `${API}/work/start`,
    {},
    { headers }
  );

  if (!tickRef.current) {
    tickRef.current = setInterval(() => {
      axios.post(`${API}/work/tick`, {}, { headers });
    }, 30000);
  }
};


    const pause = async () => {
      await axios.post(`${API}/work/pause`, {}, { headers });
      clearInterval(tickRef.current);
      tickRef.current = null;
    };

    // Idle 5 min
    const resetIdle = () => {
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(pause, 5 * 60 * 1000);
    };

    ["mousemove", "keydown", "scroll", "click"].forEach(e =>
      window.addEventListener(e, resetIdle)
    );

    window.addEventListener("beforeunload", pause);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
      else start();
    });

    start();
    resetIdle();

    return () => {
      pause();
      clearTimeout(idleRef.current);
    };
  }, [moduleName]);
}
