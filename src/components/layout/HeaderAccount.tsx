import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logout } from "@/features/auth/actions";
import { getCurrentUser } from "@/server/auth";

/**
 * Login state in the header (desktop) and the phone menu. Reads the session cookie,
 * so it is always rendered inside <Suspense>.
 */
export async function HeaderAccount({ variant }: { variant: "desktop" | "menu" }) {
  const user = await getCurrentUser();

  if (variant === "desktop") {
    return user ? (
      <Button href="/mypage" variant="secondary" className="gap-2 px-4 text-[14px]">
        <UserRound className="size-4" aria-hidden />
        <span className="max-w-[10em] truncate">{user.name || "マイページ"}</span>
      </Button>
    ) : (
      <>
        <Button href="/login" variant="text" arrow={false} className="px-3 text-[14px]">
          ログイン
        </Button>
        <Button href="/register" variant="secondary" className="px-5 text-[14px]">
          選手登録
        </Button>
      </>
    );
  }

  return user ? (
    <div className="grid grid-cols-2 gap-3">
      <Button href="/mypage">マイページ</Button>
      <form action={logout}>
        <Button type="submit" variant="secondary" className="w-full gap-2">
          <LogOut className="size-4" aria-hidden />
          ログアウト
        </Button>
      </form>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-3">
      <Button href="/login" variant="secondary">
        ログイン
      </Button>
      <Button href="/register">選手登録</Button>
    </div>
  );
}
