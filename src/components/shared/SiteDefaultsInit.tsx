"use client";

import { useEffect } from "react";
import { applySiteDefaults } from "@/lib/site-defaults";

export function SiteDefaultsInit() {
  useEffect(() => {
    applySiteDefaults();
  }, []);
  return null;
}
