export default function Loading() {
  return (
    <div aria-busy="true" className="animate-pulse space-y-8">
      <div className="h-8 w-56 rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="aspect-[2/3] rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
