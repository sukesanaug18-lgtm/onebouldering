"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Opens the print dialog (choose "PDF に保存" there to make a PDF). */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      印刷 / PDF 保存
    </Button>
  );
}
