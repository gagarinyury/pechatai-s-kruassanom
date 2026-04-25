export function CompactMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-bakery-100 px-3 py-2 shadow-sm text-center">
      <div className="text-lg md:text-xl font-black text-bakery-800 leading-none">{value}</div>
      <div className="text-[8px] md:text-[9px] uppercase tracking-widest font-black text-bakery-400 mt-1">{label}</div>
    </div>
  );
}
