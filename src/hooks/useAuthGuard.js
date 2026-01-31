"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function useAuthGuard(allowedRoles = []) {
  const router = useRouter();

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const role = res.data.role;

        if (
          allowedRoles.length > 0 &&
          !allowedRoles.includes(role)
        ) {
          router.replace("/login");
        }
      } catch (err) {
        localStorage.clear();
        router.replace("/login");
      }
    };

    verifyUser();
  }, [router, allowedRoles]);
}
