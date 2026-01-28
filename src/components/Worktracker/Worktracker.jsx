"use client";
import useIdleWorkTimer from "@/hooks/useIdleWorkTimer";

export default function WorkTracker() {
  useIdleWorkTimer();
  return null; // nothing to render
}
