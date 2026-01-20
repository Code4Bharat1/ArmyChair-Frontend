import { useEffect } from "react";
import axios from "axios";

export default function useIdleWorkTimer(moduleName) {
  useEffect(() => {
    let idleTimer;
    let tickInterval;

    const API = process.env.NEXT_PUBLIC_API_URL;
    const token = localStorage.getItem("token");

    const start = async () => {
      await axios.post(
        `${API}/work/start`,
        { module: moduleName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      tickInterval = setInterval(() => {
        axios.post(
          `${API}/work/tick`,
          { module: moduleName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }, 30000);

      const resetIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
          await axios.post(
            `${API}/work/pause`,
            { module: moduleName },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          clearInterval(tickInterval);
        }, 2 * 60 * 60 * 1000);
      };

      ["click","mousemove","keydown","scroll"].forEach(e =>
        window.addEventListener(e, resetIdle)
      );

      resetIdle();
    };

    start();

    return () => {
      clearInterval(tickInterval);
      clearTimeout(idleTimer);
    };
  }, [moduleName]);
}
