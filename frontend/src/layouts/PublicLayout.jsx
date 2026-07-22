import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}