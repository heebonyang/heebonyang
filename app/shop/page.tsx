import type { Metadata } from "next";
import ShopPage from "./ShopPage";

export const metadata: Metadata = {
  title: "양희본 0집 CD 구매",
  description: "양희본 0집 CD 구매 안내",
};

export default function Page() {
  return <ShopPage />;
}
