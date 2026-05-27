import axios from "axios";
import { useQuery } from "react-query";

const BASE_URL = `https://miruro-api-eta.vercel.app`;

export function useSearch(name) {
  const { data, isLoading, isError } = useQuery(["search", name], async () => {
    if (!name) return null;
    const res = await axios.get(`${BASE_URL}/search?query=${name}`);
    return res.data;
  });

  if (!name) return { isLoading: true };

  const results = data?.results;
  if (results && results.length === 0) {
    return { noAnime: true, isLoading: false, isError };
  }

  // Miruro returns one anime for both sub and dub. 
  // We return it under both keys to maintain compatibility with the old hook shape temporarily, 
  // though we will update WatchAnime to use just 'anime'.
  return {
    anime: results?.[0], 
    sub: results?.[0], 
    dub: results?.[0],
    isLoading,
    isError,
  };
}

export function useAnimeInfo(id) {
  const { data: infoData, isLoading: infoLoading, isError: infoError } = useQuery(["info", id], async () => {
    if (!id) return null;
    const res = await axios.get(`${BASE_URL}/info/${id}`);
    return res.data;
  });

  const { data: epsData, isLoading: epsLoading, isError: epsError } = useQuery(["episodes", id], async () => {
    if (!id) return null;
    const res = await axios.get(`${BASE_URL}/episodes/${id}`);
    return res.data;
  });

  if (!id) return { isLoading: true };
  
  const isLoading = infoLoading || epsLoading;
  const isError = infoError || epsError;

  if (isLoading || isError || !infoData || !epsData) {
    return { isLoading: true, isError, id };
  }

  // Find the first provider that has episodes (e.g. "kiwi", "zoro", etc.)
  let defaultProvider = "";
  let providers = epsData.providers || {};
  let subEpisodes = [];
  let dubEpisodes = [];

  if (Object.keys(providers).length > 0) {
    // Just pick the first available provider for simplicity, usually kiwi or zoro
    defaultProvider = Object.keys(providers)[0];
    const eps = providers[defaultProvider]?.episodes || {};
    subEpisodes = eps.sub || [];
    dubEpisodes = eps.dub || [];
  }

  return {
    id: infoData.id,
    title: infoData.title?.english || infoData.title?.romaji || infoData.title?.native,
    image: infoData.coverImage?.extraLarge || infoData.coverImage?.large,
    description: infoData.description,
    episodes: subEpisodes, // default to sub
    subEpisodes,
    dubEpisodes,
    providers: Object.keys(providers),
    currentProvider: defaultProvider,
    allEpisodes: epsData.providers,
    isLoading: false,
    isError: false,
  };
}

export function useServers(providersArray) {
  if (!providersArray) return [];
  const providerMapping = {
    kiwi: "ANIMEPAHE (SERVER 1)",
    bee: "ANIKOTO (SERVER 2)",
    ally: "ALLMANGA (SERVER 3)",
    dune: "GOGOANIME (SERVER 4)",
    ANIMEKAI: "ANIMEKAI (SERVER 5)",
    SENSHI: "SENSHI (SERVER 6)",
    ANIMEGG: "ANIMEGG (SERVER 7)",
    CRUNCHYROLL: "CRUNCHYROLL (SERVER 8)"
  };
  const preferredOrder = ["kiwi", "bee", "ally", "dune", "ANIMEKAI", "SENSHI", "ANIMEGG", "CRUNCHYROLL"];
  const sortedProviders = [...providersArray].sort((a, b) => {
    const idxA = preferredOrder.indexOf(a);
    const idxB = preferredOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });
  return sortedProviders.map((p) => ({ id: p, name: providerMapping[p] || p.toUpperCase() }));
}

export function useEpisodeFiles(episodeId) {
  const { data, isLoading, isError } = useQuery(["watch", episodeId], async () => {
    if (!episodeId) return null;
    const res = await axios.get(`${BASE_URL}/${episodeId}`);
    return res.data;
  });

  if (!episodeId) return { isLoading: true };

  if (isLoading || isError || !data) {
    return { isLoading, isError, sources: [] };
  }

  // Support both normal streams and ssub.streams (e.g. dune/gogoanime structure)
  const rawStreams = data.streams || (data.ssub && data.ssub.streams) || [];

  // Map, filter, and sort streams
  const sources = rawStreams
    .filter(stream => stream.url && stream.url.trim() !== "")
    .map(stream => {
      const typeLabel = stream.type === "embed" ? "Embed" : "Direct";
      const qual = stream.quality || "Default";
      return {
        quality: `${qual} (${typeLabel})`,
        url: stream.url,
        type: stream.type || "hls"
      };
    })
    .sort((a, b) => {
      // Prioritize Embed (3) over HLS (2) and MP4 (1) for browser CORS compatibility
      const score = (type) => {
        if (type === "embed") return 3;
        if (type === "hls") return 2;
        if (type === "mp4") return 1;
        return 0;
      };
      return score(b.type) - score(a.type);
    });

  return {
    sources,
    isLoading: false,
    isError: false,
  };
}
