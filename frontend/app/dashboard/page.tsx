"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to defense page
    router.replace("/defense");
  }, [router]);

  return null;
}
