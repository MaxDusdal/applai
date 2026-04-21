import * as React from "react";
import { cn } from "@/lib/utils";

const InlineInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, value, defaultValue, onChange, ...props }, ref) => {
  const mirrorRef = React.useRef<HTMLSpanElement>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const setRefs = React.useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  // Sync width from hidden mirror span
  const syncWidth = React.useCallback(() => {
    if (mirrorRef.current && inputRef.current) {
      // Add a small buffer so the cursor doesn't clip
      inputRef.current.style.width = `${mirrorRef.current.offsetWidth + 2}px`;
    }
  }, []);

  const displayValue = (value ?? defaultValue ?? "") as string;

  React.useEffect(() => {
    syncWidth();
  }, [displayValue, syncWidth]);

  return (
    <span className="relative inline-flex items-baseline">
      {/* Hidden mirror to measure text width */}
      <span
        ref={mirrorRef}
        aria-hidden
        className={cn(
          "pointer-events-none invisible absolute left-0 top-0 whitespace-pre",
          className,
        )}
      >
        {displayValue ? displayValue : (props.placeholder ?? "")}
      </span>
      <input
        ref={setRefs}
        data-slot="inline-input"
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        className={cn(
          "min-w-[1ch] border-b border-dotted border-muted-foreground/30 bg-transparent px-0 py-0 leading-normal outline-none transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/60 focus:border-muted-foreground disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </span>
  );
});

InlineInput.displayName = "InlineInput";

export { InlineInput };
