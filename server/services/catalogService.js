async function searchCatalogTracks({
  baseUrl,
  clientId,
  query,
  limit = 1,
}) {
  const artistNameParam = encodeURIComponent(query).replace(/%20/g, "+");
  const requestUrl =
    `${baseUrl}albums/tracks/` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&format=jsonpretty` +
    `&limit=${limit}` +
    `&artist_name=${artistNameParam}` +
    `&type=album+single`;

  const upstream = await fetch(requestUrl);
  if (!upstream.ok) {
    throw new Error(`Catalog provider request failed with status ${upstream.status}`);
  }

  const data = await upstream.json();
  const albums = Array.isArray(data?.results) ? data.results : [];

  const tracks = albums.flatMap((album) => {
    const albumTracks = Array.isArray(album?.tracks) ? album.tracks : [];
    return albumTracks.map((track) => ({
      id: track.id || `${album.id}-${track.name || "track"}`,
      name: track.name || "Unknown Track",
      artistName: track.artist_name || album.artist_name || "Unknown Artist",
      albumName: album.name || "Unknown Album",
      audio: track.audio || "",
      image:
        track.image ||
        track.album_image ||
        album.image ||
        album.album_image ||
        "",
    }));
  });

  return tracks.filter((track) => track.audio);
}

module.exports = {
  searchCatalogTracks,
};
