export function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-bakery-50 p-3 text-center">
      <div className="text-lg font-black text-bakery-800">{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-black text-bakery-400">{label}</div>
    </div>
  );
}
