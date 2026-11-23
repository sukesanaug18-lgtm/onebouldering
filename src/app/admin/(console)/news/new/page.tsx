import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { NewsForm } from "@/features/news/components/NewsForm";
import { PageSkeleton } from "@/features/tnfc/components/Parts";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "NEWS を書く" };

async function Form() {
  await requireAdmin();
  return (
    <NewsForm
      values={{
        id: "",
        title: "",
        category: "お知らせ",
        publishedAt: "",
        body: "",
        status: "draft",
        isPinned: false,
        imageUrl: null,
      }}
    />
  );
}

export default function NewNewsPage() {
  return (
    <>
      <Link
        href="/admin/news"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        NEWS 一覧へ
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">記事を書く</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Form />
      </Suspense>
    </>
  );
}
