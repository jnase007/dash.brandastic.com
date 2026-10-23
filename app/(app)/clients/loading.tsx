export default function Loading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-black/10" />
      <div className="h-24 rounded-2xl bg-black/5" />
      <div className="h-24 rounded-2xl bg-black/5" />
      <div className="h-64 rounded-2xl bg-black/5" />
    </div>
  );
}
