import { NavBar } from "@/components/NavBar";
import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 pb-24 sm:pb-10">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
