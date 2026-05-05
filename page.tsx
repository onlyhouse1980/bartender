"use client";

import dynamic from "next/dynamic";

const BarStartApp = dynamic(() => import("@/App"), {
  ssr: false,
  loading: () => null,
});

export default function Page() {
  return <BarStartApp />;
}
