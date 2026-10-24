import type { Metadata } from "next";
import CampaignPage from "@/components/CampaignPage";

export const metadata: Metadata = {
  title: "AI Courses Summer Camp - Karachi",
  description: "Hands-on AI courses for kids and students in Karachi. Book your free demo class.",
};

export default function SummerCamp() {
  return <CampaignPage campaign="summer_camp" />;
}
