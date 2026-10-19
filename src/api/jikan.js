import { useQuery } from "react-query";
import {
  fetchAnimeByFilter,
  fetchAnimeById,
  fetchAnimeByType,
  fetchAnimeSearch,
  fetchGenres,
  fetchAnimeByGenre as fetchAniListGenre,
  fetchMostFavorite,
  fetchMostPopular,
  fetchRandomAnime,
  fetchRecommendedAnime,
  fetchTopAiring,
  fetchTopCharacters as fetchAniListCharacters,
  fetchTopUpcoming,
  fetchAnimeReviews as fetchAniListReviews,
} from "./anilist";

import {
  favoriteData,
  popularData,
  topAiringData,
  upcoming,
} from "../data/featured";
import {
  moviesData,
  onaData,
  ovaData,
  specialsData,
} from "../data/mainSection";
import { genreData } from "../data/genre";
import charactersFallback from "../data/characters";
import { animeReviewsData, mangaReviewsData } from "../data/reviews";

const queryConfig = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1,
};

const genreMap = {};
if (genreData?.data) {
  genreData.data.forEach((g) => {
    genreMap[g.mal_id] = g.name;
    genreMap[String(g.mal_id)] = g.name;
    genreMap[g.name.toLowerCase()] = g.name;
  });
}

function createQueryHook(queryKey, fetcher, fallbackData) {
  return () => {
    const { data, isLoading, isError } = useQuery(
      queryKey,
      async () => {
        try {
          const res = await fetcher();
          return { data: res };
        } catch (err) {
          console.warn(`Live query failed for ${queryKey}, using fallback:`, err);
          return fallbackData || { data: [] };
        }
      },
      queryConfig
    );

    const safeData = data || fallbackData || { data: [] };
    return {
      data: safeData,
      isLoading: isLoading && !data,
      isError: isError && !fallbackData,
    };
  };
}

export const getTopAiring = createQueryHook(
  "top-airing",
  () => fetchTopAiring(4),
  topAiringData
);

export const getMostPopular = createQueryHook(
  "most-popular",
  () => fetchMostPopular(4),
  popularData
);

export const getMostFavorite = createQueryHook(
  "most-favorite",
  () => fetchMostFavorite(4),
  favoriteData
);

export const getTopUpcoming = createQueryHook(
  "top-upcoming",
  () => fetchTopUpcoming(4),
  upcoming
);

export const getTopMovies = createQueryHook(
  "top-movies",
  () => fetchAnimeByType("movie", 12),
  moviesData
);

export const getTopOVAs = createQueryHook(
  "top-OVAs",
  () => fetchAnimeByType("ova", 12),
  ovaData
);

export const getTopONAs = createQueryHook(
  "top-ONAs",
  () => fetchAnimeByType("ona", 12),
  onaData
);

export const getTopSpecials = createQueryHook(
  "top-specials",
  () => fetchAnimeByType("special", 12),
  specialsData
);

export const getGenre = createQueryHook(
  "genre",
  async () => {
    const genres = await fetchGenres();
    return genres;
  },
  genreData
);

export const getTopCharacters = createQueryHook(
  "top-characters",
  () => fetchAniListCharacters(5),
  charactersFallback
);

export const getAnimeReviews = createQueryHook(
  "top-anime-reviews",
  () => fetchAniListReviews(10),
  animeReviewsData
);

export const getMangaReviews = createQueryHook(
  "top-manga-reviews",
  () => fetchAniListReviews(10),
  mangaReviewsData
);

export function getAnimeByMalId(id) {
  const { data, isLoading, isError } = useQuery(
    ["anime-by-id", id],
    async () => {
      if (!id) return null;
      try {
        const item = await fetchAnimeById(id);
        return { data: item };
      } catch (err) {
        console.warn(`Failed to fetch anime by ID ${id}:`, err);
        // Find in static datasets
        const allStatic = [
          ...(topAiringData?.data || []),
          ...(popularData?.data || []),
          ...(favoriteData?.data || []),
          ...(moviesData?.data || []),
        ];
        const match = allStatic.find(
          (a) => String(a.mal_id) === String(id) || String(a.id) === String(id)
        );
        return { data: match || null };
      }
    },
    {
      ...queryConfig,
      enabled: Boolean(id),
    }
  );

  return {
    data: data,
    isLoading: isLoading && !data,
    isError,
  };
}

export function getAnimeByGenre(mal_id) {
  const genreName = genreMap[mal_id] || (typeof mal_id === "string" ? mal_id : "Action");

  const { data, isLoading, isError } = useQuery(
    ["anime-by-genre", genreName],
    async () => {
      try {
        const list = await fetchAniListGenre(genreName, 24);
        return { data: list };
      } catch (err) {
        console.warn(`Failed to fetch genre ${genreName}:`, err);
        return popularData || { data: [] };
      }
    },
    queryConfig
  );

  return {
    data: data || popularData || { data: [] },
    isLoading: isLoading && !data,
    isError,
  };
}

export function getAnimeByFilter(filterName) {
  const { data, isLoading, isError } = useQuery(
    ["anime-by-filter", filterName],
    async () => {
      try {
        const list = await fetchAnimeByFilter(filterName, 24);
        return { data: list };
      } catch (err) {
        console.warn(`Failed to fetch filter ${filterName}:`, err);
        if (filterName === "airing") return topAiringData;
        if (filterName === "favorite") return favoriteData;
        if (filterName === "upcoming") return upcoming;
        return popularData;
      }
    },
    queryConfig
  );

  return {
    data: data || popularData || { data: [] },
    isLoading: isLoading && !data,
    isError,
  };
}

export function getAnimeByType(type) {
  const { data, isLoading, isError } = useQuery(
    ["anime-by-type", type],
    async () => {
      try {
        const list = await fetchAnimeByType(type, 24);
        return { data: list };
      } catch (err) {
        console.warn(`Failed to fetch type ${type}:`, err);
        if (type === "movie") return moviesData;
        if (type === "ova") return ovaData;
        if (type === "ona") return onaData;
        if (type === "special") return specialsData;
        return popularData;
      }
    },
    queryConfig
  );

  return {
    data: data || moviesData || { data: [] },
    isLoading: isLoading && !data,
    isError,
  };
}

export function getRecommendedAnime(_type) {
  const { data, isLoading, isError } = useQuery(
    "recommended-anime",
    async () => {
      try {
        const list = await fetchRecommendedAnime(24);
        return { data: list };
      } catch (err) {
        return popularData;
      }
    },
    queryConfig
  );

  return {
    data: data || popularData || { data: [] },
    isLoading: isLoading && !data,
    isError,
  };
}

export function getRandomAnime() {
  const { data, isLoading, isError } = useQuery(
    "random-anime",
    async () => {
      try {
        const item = await fetchRandomAnime();
        return { data: item };
      } catch (err) {
        const fallback = popularData.data[0];
        return { data: fallback };
      }
    },
    { ...queryConfig, staleTime: 0 }
  );

  return {
    data: data || { data: popularData.data[0] },
    isLoading: isLoading && !data,
    isError,
  };
}

export function getAnimeSearch(name, _parameter) {
  const queryTerm = name || "";
  const { data, isLoading, isError } = useQuery(
    ["anime-search", queryTerm],
    async () => {
      if (!queryTerm.trim()) {
        return { data: [] };
      }
      try {
        const list = await fetchAnimeSearch(queryTerm.trim(), 24);
        return { data: list };
      } catch (err) {
        console.warn(`Search error for ${queryTerm}:`, err);
        // Local search in static popular data
        const matches = (popularData?.data || []).filter((item) => {
          const t = (item.title || item.title_english || "").toLowerCase();
          return t.includes(queryTerm.toLowerCase());
        });
        return { data: matches };
      }
    },
    {
      ...queryConfig,
      enabled: Boolean(queryTerm.trim().length > 0),
    }
  );

  return {
    data: data || { data: [] },
    isLoading: isLoading && !data,
    isError,
  };
}
