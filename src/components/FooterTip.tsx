export function FooterTip({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className="flex flex-col items-center text-center max-w-[200px] gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-bakery-800">{title}</span>
      <p className="text-[10px] text-bakery-400 leading-tight font-medium">{text}</p>
    </div>
  );
}
