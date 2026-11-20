import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Buttons (CLAUDE.md 6-6).
 * - primary:   black fill, white text. One per screen.
 * - secondary: white with a 1px border.
 * - text:      text + ChevronRight.
 * Height is 44px or more. Pass `href` to render a link; external URLs open in a
 * new tab and get the external-link icon (6-8).
 */
type Variant = "primary" | "secondary" | "text";
type Size = "md" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Text buttons show a ChevronRight; set false to hide it. */
  arrow?: boolean;
};

type LinkButtonProps = CommonProps & { href: string } & Omit<
    ComponentProps<"a">,
    "href" | "className" | "children"
  >;
type NativeButtonProps = CommonProps & { href?: undefined } & Omit<
    ComponentProps<"button">,
    "className" | "children"
  >;
export type ButtonProps = LinkButtonProps | NativeButtonProps;

const base =
  "group inline-flex min-h-11 items-center justify-center gap-1.5 font-display font-bold whitespace-nowrap transition-colors duration-200 outline-offset-2 focus-visible:outline-2 focus-visible:outline-text disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "rounded-full bg-text text-white hover:bg-[#333336]",
  secondary:
    "rounded-full border border-line bg-white/70 text-text backdrop-blur-md hover:border-gray-300 hover:bg-white",
  text: "rounded-md text-text hover:text-text-2",
};

const sizes: Record<Variant, Record<Size, string>> = {
  primary: { md: "px-6 text-[15px]", lg: "min-h-13 px-8 text-base" },
  secondary: { md: "px-6 text-[15px]", lg: "min-h-13 px-8 text-base" },
  text: { md: "px-1 text-[15px]", lg: "px-1 text-base" },
};

const isExternal = (href: string) => /^https?:\/\//.test(href);

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(base, variants[variant], sizes[variant][size], className);

  if (props.href !== undefined) {
    const {
      href,
      arrow: _arrow,
      variant: _variant,
      size: _size,
      className: _className,
      children: _children,
      ...rest
    } = props;
    const external = isExternal(href);
    const content = (
      <>
        {children}
        {external ? (
          <>
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">（新しいタブで開きます）</span>
          </>
        ) : (
          variant === "text" && props.arrow !== false && <Chevron />
        )}
      </>
    );
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  const {
    arrow: _arrow,
    variant: _variant,
    size: _size,
    className: _className,
    children: _children,
    type = "button",
    ...rest
  } = props;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
      {variant === "text" && props.arrow !== false && <Chevron />}
    </button>
  );
}

function Chevron() {
  return (
    <ChevronRight
      className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
      aria-hidden
    />
  );
}
