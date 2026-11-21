import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Text input with label, hint and error. Inputs are 48px tall and 16px text (no iOS zoom). */
export function Field({
  label,
  name,
  hint,
  error,
  required,
  className,
  children,
  ...input
}: ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string[];
  children?: ReactNode;
}) {
  const id = `f-${name}`;
  const describedBy = [hint && `${id}-hint`, error?.length && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      {/* With custom children (e.g. a radio group) there is no single input to point at. */}
      {children ? (
        <p id={id} className="flex items-center gap-2 text-sm font-bold">
          {label}
          {required && <span className="text-xs font-medium text-status-rejected">必須</span>}
        </p>
      ) : (
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-bold">
          {label}
          {required && <span className="text-xs font-medium text-status-rejected">必須</span>}
        </label>
      )}
      {children ?? (
        <input
          id={id}
          name={name}
          required={required}
          aria-invalid={error?.length ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "mt-2 block min-h-12 w-full rounded-xl border bg-white px-4 text-base outline-offset-2 transition-colors duration-200 placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-text",
            error?.length ? "border-status-rejected" : "border-line hover:border-gray-300",
          )}
          {...input}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-text-3">
          {hint}
        </p>
      )}
      {error?.length ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-status-rejected">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level message (error or success). */
export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-status-rejected/30 bg-status-rejected/5 text-[#b91c1c]"
          : "border-status-approved/30 bg-status-approved/5 text-[#047857]",
      )}
    >
      {children}
    </p>
  );
}
