"use client";

import { useEffect } from "react";

export default function PlanosRedirectPage() {
  useEffect(() => {
    window.location.href = "/precos";
  }, []);
  return null;
}

