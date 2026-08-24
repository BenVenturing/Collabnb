// Renders the line items inside <ReceiptPrinter.Paper>. Shared by the
// internal /dev/receipt-preview mock and the real post-checkout overlay so
// the two never drift apart visually.
export default function ReceiptContent({
  kicker,
  orderId,
  date,
  card,
  items,
  subtotal,
  tax,
  total,
  totalLabel,
  thanks,
  footNote,
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-1 pb-4 text-center">
        <span className="text-[0.65rem] font-bold tracking-[0.2em]">COLLABNB</span>
        <span className="text-[0.6rem] tracking-[0.15em] text-black/50">{kicker}</span>
      </div>

      <div className="border-t border-dashed border-black/25 pt-3 text-[0.65rem] leading-relaxed text-black/60">
        <div className="flex justify-between"><span>Order</span><span>{orderId}</span></div>
        <div className="flex justify-between"><span>Date</span><span>{date}</span></div>
        <div className="flex justify-between"><span>Payment</span><span>{card}</span></div>
      </div>

      <div className="my-4 border-t border-dashed border-black/25" />

      <div className="flex flex-col gap-2 text-[0.7rem]">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between gap-3">
            <span className="min-w-0">
              {item.label}
              <span className="block text-[0.6rem] text-black/45">{item.detail}</span>
            </span>
            <span className="shrink-0 font-semibold">{item.amount}</span>
          </div>
        ))}
      </div>

      <div className="my-4 border-t border-dashed border-black/25" />

      <div className="flex flex-col gap-1.5 text-[0.65rem] text-black/60">
        <div className="flex justify-between"><span>Subtotal</span><span>{subtotal}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>{tax}</span></div>
      </div>
      <div className="mt-2 flex justify-between border-t border-black/80 pt-2 text-[0.8rem] font-bold">
        <span>{totalLabel}</span>
        <span>{total}</span>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <span className="text-[0.7rem] font-bold">{thanks}</span>
        <span className="max-w-[15rem] text-[0.6rem] leading-relaxed text-black/50">{footNote}</span>
      </div>

      <div
        aria-hidden="true"
        className="mx-auto mt-6 h-6 w-4/5 opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, black 0 1px, transparent 1px 3px, black 3px 4px, transparent 4px 7px, black 7px 9px, transparent 9px 11px)",
        }}
      />
    </>
  );
}
