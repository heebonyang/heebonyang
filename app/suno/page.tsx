import type { Metadata } from "next";
import SunoFactory from "./SunoFactory";

export const metadata: Metadata = {
  title: "수노 공장 — Heebon Yang",
  robots: { index: false, follow: false },
};

export default function SunoPage() {
  return <SunoFactory />;
}
