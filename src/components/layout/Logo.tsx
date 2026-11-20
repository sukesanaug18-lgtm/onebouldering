import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 items-center rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-text",
        className,
      )}
    >
      <Image
        src="/images/onebouldering_logo.png"
        alt="ONE Bouldering ホーム"
        width={663}
        height={304}
        priority={priority}
        sizes="160px"
        className="h-8 w-auto md:h-9"
      />
    </Link>
  );
}
