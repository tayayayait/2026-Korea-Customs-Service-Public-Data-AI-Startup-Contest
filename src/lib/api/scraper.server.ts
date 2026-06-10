export async function fetchJinaReader(url: string): Promise<string> {
  if (!url || !url.startsWith("http")) {
    throw new Error("Invalid URL provided to Jina Reader");
  }

  const jinaUrl = `https://r.jina.ai/${url}`;
  const response = await fetch(jinaUrl, {
    headers: {
      "X-Return-Format": "markdown",
    },
  });

  if (!response.ok) {
    throw new Error(`Jina Reader API failed with status ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}
