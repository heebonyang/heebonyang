import type { Metadata } from "next";
import AdminApp from "./AdminApp";

export const metadata: Metadata = {
  title: "관리자 — Heebon Yang",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
