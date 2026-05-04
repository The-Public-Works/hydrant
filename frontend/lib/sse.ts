// Minimal SSE parser over fetch+ReadableStream.
// Yields { event, data } objects. Closes when the stream ends or `signal`
// aborts.

export type SseEvent = { event: string; data: string };

export async function* sseFetch(
  url: string,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const resp = await fetch(url, {
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`SSE ${resp.status}: ${await resp.text().catch(() => "")}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line. Per spec the line ending
      // is \r\n, but \n alone is also legal — sse-starlette uses \r\n.
      while (true) {
        const idxCRLF = buf.indexOf("\r\n\r\n");
        const idxLF = buf.indexOf("\n\n");
        let sepIdx = -1;
        let sepLen = 0;
        if (idxCRLF !== -1 && (idxLF === -1 || idxCRLF < idxLF)) {
          sepIdx = idxCRLF;
          sepLen = 4;
        } else if (idxLF !== -1) {
          sepIdx = idxLF;
          sepLen = 2;
        } else {
          break;
        }
        const frame = buf.slice(0, sepIdx);
        buf = buf.slice(sepIdx + sepLen);

        let event = "message";
        const dataLines: string[] = [];
        for (const rawLine of frame.split("\n")) {
          const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
          if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
          }
        }
        if (dataLines.length) {
          yield { event, data: dataLines.join("\n") };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
