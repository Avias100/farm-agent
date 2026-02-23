import ActivityLoggerPage from './pages/ActivityLogger'

/**
 * App root.
 *
 * Currently renders Module 1: Daily Activity Logger directly.
 * React Router will be added when Module 2 is built — the route
 * structure is noted in the comments below so the addition is trivial.
 *
 * Future route map:
 *   /          → ActivityLogger   (Module 1)
 *   /scouting  → ScoutingPage     (Module 2)
 *   /market    → MarketPage       (Module 3)
 *   /nursery   → NurseryPage      (Module 4)
 *   /staff     → StaffPage        (Module 5)
 *   /crm       → CrmPage          (Module 6)
 *   /dashboard → DashboardPage    (Module 7)
 *   /workplan  → WorkplanPage     (Module 8)
 */
export default function App() {
  return <ActivityLoggerPage />
}
