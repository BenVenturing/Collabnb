import { CheckCircle2, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useContext } from "react";

// stage: "processing" | "printing" | "complete"

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

const ReceiptPrinterContext = createContext(null);

const easeOut = [0.23, 1, 0.32, 1];
const easeInOut = [0.77, 0, 0.175, 1];

const toothCount = 32;
const toothDepth = 4;
const toothPoints = Array.from({ length: toothCount * 2 }, (_, index) => {
  const x = 100 - ((index + 1) * 100) / (toothCount * 2);
  const y = index % 2 === 0 ? "100%" : `calc(100% - ${toothDepth}px)`;
  return `${x}% ${y}`;
}).join(", ");
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${toothDepth}px), ${toothPoints})`;

const printingTransformKeyframes = [
  "translateY(calc(-100% + 2px))",
  "translateY(-91%)", "translateY(-91%)",
  "translateY(-81%)", "translateY(-81%)",
  "translateY(-70%)", "translateY(-70%)",
  "translateY(-58%)", "translateY(-58%)",
  "translateY(-45%)", "translateY(-45%)",
  "translateY(-32%)", "translateY(-32%)",
  "translateY(-20%)", "translateY(-20%)",
  "translateY(-10%)", "translateY(-10%)",
  "translateY(-3%)", "translateY(-3%)",
  "translateY(0%)",
];

const printingKeyframeTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6,
  0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1,
];

const statusLabels = {
  processing: "Processing your order",
  printing: "Printing your receipt",
  complete: "Order complete",
};

function useReceiptPrinter(component) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }
  return context;
}

function ReceiptPrinterRoot({
  "aria-label": ariaLabel = "Receipt printer",
  animate = true,
  children,
  className,
  feedMotion = "stepped",
  stage,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const context = {
    animate,
    feedMotion,
    shouldMove: animate && !shouldReduceMotion,
    stage,
  };

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn("relative isolate flex w-full max-w-sm flex-col items-center", className)}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function ReceiptPrinterMachine({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-[1.5rem] p-3 pb-8",
        className,
      )}
      style={{
        background: "linear-gradient(155deg, #23332F 0%, var(--ink) 65%)",
        boxShadow:
          "0 20px 36px -20px rgba(25,37,36,0.55), 0 6px 14px -8px rgba(25,37,36,0.3), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.35)",
      }}
      {...props}
    >
      {children}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-3 z-40 h-2 rounded-[0.25rem]"
        style={{ background: "#0d1413", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)" }}
      />
    </div>
  );
}

function ReceiptPrinterHeader({ children, className, ...props }) {
  return (
    <div className={cn("relative z-10 flex h-11 items-start justify-between px-1", className)} {...props}>
      {children}
    </div>
  );
}

function ReceiptPrinterScreen({ children, className, ...props }) {
  return (
    <div
      className={cn("relative z-10 isolate overflow-hidden rounded-[1rem] p-4", className)}
      style={{
        background: "#0d1413",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 2px 10px rgba(0,0,0,0.6)",
      }}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatusIndicator({ animate, move, stage }) {
  const isComplete = stage === "complete";

  return (
    <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="sync">
        {isComplete ? (
          <motion.span
            animate={{ opacity: 1, transform: "scale(1)" }}
            className="col-start-1 row-start-1 grid place-items-center"
            style={{ color: "#5fd6a8" }}
            exit={{ opacity: animate ? 0 : 1, transform: move ? "scale(0.96)" : "scale(1)" }}
            initial={{ opacity: animate ? 0 : 1, transform: move ? "scale(0.94)" : "scale(1)" }}
            key="complete"
            transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
          >
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </motion.span>
        ) : (
          <motion.span
            animate={{ opacity: 1, transform: "scale(1)" }}
            className="col-start-1 row-start-1 grid place-items-center text-[var(--sage)]"
            exit={{ opacity: animate ? 0 : 1, transform: move ? "scale(0.96)" : "scale(1)" }}
            initial={{ opacity: animate ? 0 : 1, transform: move ? "scale(0.94)" : "scale(1)" }}
            key="working"
            transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
          >
            <LoaderCircle className={cn(animate && "animate-spin motion-reduce:animate-none")} size={18} strokeWidth={2.25} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function ReceiptPrinterStatus({ children, className, ...props }) {
  const { animate, shouldMove, stage } = useReceiptPrinter("ReceiptPrinter.Status");

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} {...props}>
      <StatusIndicator animate={animate} move={shouldMove} stage={stage} />
      <div aria-live="polite" className="grid min-w-0 flex-1 items-center" role="status">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            className="col-start-1 row-start-1 truncate font-medium text-white/80 text-xs leading-none"
            exit={{ opacity: animate ? 0 : 1, transform: shouldMove ? "translateY(-4px)" : "translateY(0px)" }}
            initial={{ opacity: animate ? 0 : 1, transform: shouldMove ? "translateY(4px)" : "translateY(0px)" }}
            key={stage}
            transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
          >
            {children ?? statusLabels[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReceiptPrinterPaper({ children, className, style, ...props }) {
  return (
    <article
      className={cn("relative z-10 min-h-80 px-6 pt-7 pb-8 font-mono", className)}
      style={{
        background: "var(--surface)",
        color: "var(--ink)",
        clipPath: receiptClipPath,
        ...style,
      }}
      {...props}
    >
      {children}
    </article>
  );
}

function ReceiptPrinterOutput({ children, className, ...props }) {
  const { animate, feedMotion, shouldMove, stage } = useReceiptPrinter("ReceiptPrinter.Output");
  const isReceiptVisible = stage !== "processing";
  const shouldUseSteppedFeed = feedMotion === "stepped" && stage === "printing" && shouldMove;

  return (
    <div
      className={cn("relative z-50 -mt-4 h-[26rem] w-[calc(80%+3rem)] max-w-full overflow-hidden px-6", className)}
      {...props}
    >
      {isReceiptVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2 blur-[6px]"
          style={{ background: "rgba(13,20,19,0.75)" }}
        />
      ) : null}

      <motion.div
        animate={{
          opacity: isReceiptVisible ? 1 : 0,
          transform:
            stage === "printing" && shouldMove
              ? shouldUseSteppedFeed
                ? printingTransformKeyframes
                : "translateY(0%)"
              : isReceiptVisible || !shouldMove
                ? "translateY(0%)"
                : "translateY(calc(-100% + 2px))",
        }}
        aria-hidden={stage !== "complete"}
        className="relative isolate"
        style={{
          filter: "drop-shadow(0 8px 24px rgba(25,37,36,0.24))",
        }}
        initial={false}
        transition={{
          opacity: { duration: animate ? 0.16 : 0, ease: easeOut },
          transform: {
            duration: shouldMove ? 1.75 : 0,
            ease: shouldUseSteppedFeed ? "linear" : easeInOut,
            times: shouldUseSteppedFeed ? printingKeyframeTimes : undefined,
          },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export const ReceiptPrinter = {
  Header: ReceiptPrinterHeader,
  Machine: ReceiptPrinterMachine,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
  Root: ReceiptPrinterRoot,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
};
