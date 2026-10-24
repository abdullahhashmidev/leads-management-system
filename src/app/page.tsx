import type { Metadata } from "next";
import CampaignPage from "@/components/CampaignPage";

export const metadata: Metadata = {
  title: "Online AI Courses - Book a Free Demo",
  description: "Learn AI and creative skills from home with live classes. Book your free demo class.",
};

export default function Home() {
  return <CampaignPage campaign="accl" />;
}
