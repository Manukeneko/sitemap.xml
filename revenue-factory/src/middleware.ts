import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ダッシュボード全体(ページ+APIルート)への簡易Basic認証。
// DASHBOARD_BASIC_AUTH_USER / DASHBOARD_BASIC_AUTH_PASSWORD の両方が設定されている
// 場合のみ有効になる。未設定時は今まで通り認証なし(README/DESIGN.mdで「任意」と
// 案内している通りだが、本番公開する場合は強く設定を推奨する)。
export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_BASIC_AUTH_USER;
  const pass = process.env.DASHBOARD_BASIC_AUTH_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPass = decoded.slice(separatorIndex + 1);
    if (suppliedUser === user && suppliedPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AI Revenue Factory"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
