import { getAuthApiUrl } from "@/lib/auth-api";
import { getAccessToken } from "@/lib/auth-session";

export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return new Response(null, { status: 401 });
  }

  const response = await fetch(`${getAuthApiUrl()}/profile/picture`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return new Response(null, { status: response.status });
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
