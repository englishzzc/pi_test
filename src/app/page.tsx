import TankGame from "./components/TankGame";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_-10%,#123049_0%,#070b10_55%,#03060a_100%)]">
      <TankGame />
    </main>
  );
}
