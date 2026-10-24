export type Campaign = "accl" | "summer_camp";

export const CAMPAIGNS: Record<
  Campaign,
  { path: string; tab: string; badge: string; title: string; sub: string; points: string[] }
> = {
  accl: {
    path: "/",
    tab: "Online Courses",
    badge: "Online • Live classes",
    title: "Online AI Courses",
    sub: "Learn AI and creative skills from home with live classes and mentors.",
    points: ["Live online classes", "Beginner-friendly curriculum", "Free demo class", "Progress updates for parents"],
  },
  summer_camp: {
    path: "/summer-camp",
    tab: "Summer Camp",
    badge: "Onsite • Karachi",
    title: "AI Courses Summer Camp",
    sub: "Hands-on AI courses for kids and students, held onsite in Karachi.",
    points: ["Practical onsite sessions", "For both parents and students", "Small batches", "Free demo class"],
  },
};
