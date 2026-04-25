export function CompactMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white border border-bakery-100 px-3 py-2 shadow-sm text-center">
      <div className="text-base md:text-lg font-black text-bakery-800 leading-none">{value}</div>
      <div className="text-[7px] md:text-[8px] uppercase tracking-widest font-black text-bakery-400 mt-1">{label}</div>
    </div>
  );
}
