export function ResultMetric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-widest font-black opacity-60">{label}</span>
      <span className="text-2xl md:text-3xl font-bold">{value} {unit && <span className="text-sm font-normal opacity-50">{unit}</span>}</span>
    </div>
  );
}
