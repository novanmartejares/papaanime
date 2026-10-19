/* eslint-disable react-refresh/only-export-components */
import { useQuery } from "react-query";
import { fetchAniList, mapAniListMediaToJikan } from "../api/anilist";

const PROVIDERS = ["megaplay", "vidhawk", "nontongo", "twoembed"];

export function useSearch(name) {
  const { data, isLoading, isError } = useQuery(
    ["search-anime", name],
    async () => {
      if (!name || name.trim() === "") return null;

      const query = `
        query($search: String) {
          Page(page: 1, perPage: 10) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
              id
              idMal
              title { romaji english native }
              coverImage { extraLarge large medium }
              bannerImage
              episodes
              duration
              averageScore
              format
              genres
              description
              status
            }
          }
        }
      `;

      try {
        const res = await fetchAniList(query, { search: name.trim() });
        return res?.Page?.media || [];
      } catch (err) {
        console.warn("AniList search error:", err);
        return [];
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      enabled: Boolean(name && name.trim().length > 0),
    }
  );

  if (!name || name.trim() === "") {
    return { isLoading: false, noAnime: false };
  }

  if (isLoading) {
    return { isLoading: true };
  }

  const results = data || [];
  if (results.length === 0) {
    return { noAnime: true, isLoading: false, isError };
  }

  const primary = results[0];
  const mapped = mapAniListMediaToJikan(primary);

  return {
    anime: mapped,
    sub: mapped,
    dub: mapped,
    results: results.map(mapAniListMediaToJikan),
    isLoading: false,
    isError: false,
    noAnime: false,
  };
}

export function useAnimeInfo(id) {
  const { data, isLoading, isError } = useQuery(
    ["anime-info", id],
    async () => {
      if (!id) return null;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) return null;

      const query = `
        query($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large medium }
            bannerImage
            episodes
            duration
            averageScore
            format
            genres
            description
            status
          }
        }
      `;

      try {
        const res = await fetchAniList(query, { id: numericId });
        return res?.Media;
      } catch (err) {
        console.warn("AniList info fetch error:", err);
        return null;
      }
    },
    {
      staleTime: 10 * 60 * 1000,
      enabled: Boolean(id),
    }
  );

  if (!id) return { isLoading: false };
  if (isLoading) return { isLoading: true };
  if (isError || !data) return { isLoading: false, isError: true, id };

  const totalEpisodes =
    data.episodes && data.episodes > 0
      ? data.episodes
      : data.format === "MOVIE"
      ? 1
      : 24;

  const episodeList = Array.from({ length: totalEpisodes }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    title: `Episode ${i + 1}`,
  }));

  const providersObj = {};
  PROVIDERS.forEach((prov) => {
    providersObj[prov] = {
      episodes: {
        sub: episodeList,
        dub: episodeList,
      },
    };
  });

  const title =
    data.title?.english || data.title?.romaji || data.title?.native || "Anime";
  const image =
    data.coverImage?.extraLarge ||
    data.coverImage?.large ||
    data.coverImage?.medium ||
    "";
  const bannerImage = data.bannerImage || image;
  const description = data.description
    ? data.description.replace(/<[^>]*>/g, "")
    : "No description available.";

  return {
    id: data.id,
    idMal: data.idMal,
    title,
    image,
    bannerImage,
    description,
    episodes: episodeList,
    subEpisodes: episodeList,
    dubEpisodes: episodeList,
    providers: PROVIDERS,
    currentProvider: PROVIDERS[0],
    allEpisodes: providersObj,
    isLoading: false,
    isError: false,
  };
}

export function useServers(providersArray) {
  if (!providersArray || providersArray.length === 0) {
    providersArray = PROVIDERS;
  }

  const providerMapping = {
    megaplay: "MEGAPLAY (SERVER 1 - HD)",
    vidhawk: "VIDHAWK (SERVER 2 - FAST)",
    nontongo: "NONTONGO (SERVER 3)",
    twoembed: "2EMBED (SERVER 4 - MULTI)",
  };

  return providersArray.map((p) => ({
    id: p,
    name: providerMapping[p] || p.toUpperCase(),
  }));
}

export function buildStreamUrl(provider, animeId, malId, episodeNumber, isDub) {
  const ep = episodeNumber || 1;
  const audio = isDub ? "dub" : "sub";
  const aniId = animeId || 21;

  switch (provider) {
    case "vidhawk":
      return `https://vidhawk.buzz/embed/ani/${aniId}/${ep}/${audio}?server=flow`;
    case "nontongo":
      return `https://nontongo.win/anime/${aniId}/${ep}/play`;
    case "twoembed":
      return `https://www.2embed.cc/embed/anime/${aniId}/${ep}/${audio}`;
    case "megaplay":
    default:
      return `https://megaplay.buzz/stream/ani/${aniId}/${ep}/${audio}`;
  }
}

export function useEpisodeFiles(
  episodeId,
  animeId,
  malId,
  provider = "megaplay",
  isDub = false
) {
  let epNum = 1;
  let parsedAnimeId = animeId;

  if (typeof episodeId === "string" && episodeId.includes(":")) {
    const parts = episodeId.split(":");
    parsedAnimeId = parts[0] || animeId;
    epNum = parseInt(parts[1], 10) || 1;
  } else if (typeof episodeId === "number") {
    epNum = episodeId;
  } else if (typeof episodeId === "string") {
    epNum = parseInt(episodeId, 10) || 1;
  }

  if (!parsedAnimeId && !episodeId) {
    return { isLoading: false, isError: false, sources: [] };
  }

  const streamUrl = buildStreamUrl(
    provider,
    parsedAnimeId,
    malId,
    epNum,
    isDub
  );

  return {
    sources: [
      {
        quality: "Auto 1080p (Direct Embed)",
        url: streamUrl,
        type: "embed",
      },
    ],
    isLoading: false,
    isError: false,
  };
}
