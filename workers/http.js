export function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function methodNotAllowed() {
  return jsonResponse(405, { error: "Method Not Allowed" });
}

export async function readJsonBody(request) {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
}

export function sseResponse(asyncIterable) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of asyncIterable) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err.message || "流式输出失败" })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export function redirectWordlists(request) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/api/wordlists" || pathname.startsWith("/api/wordlists/")) {
    url.pathname = pathname.replace(/^\/api\/wordlists/, "/wordlists");
    return Response.redirect(url.toString(), 301);
  }

  if (pathname === "/api/wordlists-sat" || pathname.startsWith("/api/wordlists-sat/")) {
    url.pathname = pathname.replace(/^\/api\/wordlists-sat/, "/wordlists-sat");
    return Response.redirect(url.toString(), 301);
  }

  return null;
}
