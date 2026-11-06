export default function AppLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="skeleton h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-32 rounded-card" />
        <div className="skeleton h-32 rounded-card" />
        <div className="skeleton h-32 rounded-card" />
      </div>
      <div className="skeleton h-80 rounded-card" />
    </div>
  );
}
