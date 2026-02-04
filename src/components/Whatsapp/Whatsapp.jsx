"use client";

import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "919594430295";

export default function WhatsAppFloat() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 p-4 rounded-full shadow-lg hover:scale-110 transition"
    >
      <MessageCircle className="text-white" size={28} />
    </a>
  );
}
