"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to drone summary page
    router.replace("/drone-summary");
  }, [router]);

  return null;
}
