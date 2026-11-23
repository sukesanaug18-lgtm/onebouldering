"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import type { GymActionState } from "../actions";

type Action = (prev: GymActionState, formData: FormData) => Promise<GymActionState>;

/**
 * A form for one gym action that shows the result message under it.
 * `confirmText` asks before sending; "{value}" is replaced by the pressed button's value.
 */
export function GymActionForm({
  action,
  children,
  confirmText,
  id,
  className,
}: {
  action: Action;
  children: ReactNode;
  confirmText?: string;
  id?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState<GymActionState, FormData>(action, {});
  return (
    <form
      id={id}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (!confirmText) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (!window.confirm(confirmText.replace("{value}", submitter?.value ?? ""))) {
          e.preventDefault();
        }
      }}
    >
      {children}
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn(
            "mt-2 basis-full text-sm",
            state.ok ? "text-[#047857]" : "font-bold text-[#b91c1c]",
          )}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Submit button that disables itself while its form is sending. */
export function SubmitButton({
  children,
  pendingText = "処理中…",
  variant = "primary",
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold whitespace-nowrap outline-offset-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-text disabled:opacity-40",
        variant === "primary" && "bg-text text-white hover:bg-[#333336]",
        variant === "secondary" && "border border-line bg-white hover:border-gray-300",
        variant === "danger" &&
          "border border-status-rejected/40 bg-white text-[#b91c1c] hover:bg-status-rejected/5",
        className,
      )}
    >
      {pending ? pendingText : children}
    </button>
  );
}
