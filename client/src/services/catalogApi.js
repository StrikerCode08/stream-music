const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "" : import.meta.env.VITE_SOCKET_ORIGIN || "");

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return { ok: false, error: "Invalid server response" };
  }
}

export async function bootstrapCatalogCookie() {
  const response = await fetch(`${API_BASE_URL}/api/catalog/bootstrap`, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson(response);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Catalog bootstrap failed");
  }

  return data;
}

export async function searchCatalogTracks(query, limit = 8) {
  const q = (query || "").trim();
  if (!q) return [];

  const runSearch = async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/catalog/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await parseJson(response);
    return { response, data };
  };

  await bootstrapCatalogCookie();
  let { response, data } = await runSearch();

  if (response.status === 401) {
    await bootstrapCatalogCookie();
    ({ response, data } = await runSearch());
  }

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Catalog search failed");
  }

  return Array.isArray(data.tracks) ? data.tracks : [];
}
