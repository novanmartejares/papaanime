const ANILIST_URL = "https://graphql.anilist.co";

export async function fetchAniList(query, variables = {}) {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AniList HTTP error: ${response.status}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message || "AniList GraphQL error");
  }

  return json.data;
}

export function mapAniListMediaToJikan(media) {
  if (!media) return null;

  const englishTitle = media.title?.english || null;
  const romajiTitle = media.title?.romaji || englishTitle || "Unknown Anime";
  const nativeTitle = media.title?.native || romajiTitle;
  const coverLarge =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.coverImage?.medium ||
    "";
  const coverSmall =
    media.coverImage?.medium || media.coverImage?.large || coverLarge;

  return {
    mal_id: media.idMal || media.id,
    id: media.id,
    idMal: media.idMal,
    title: romajiTitle,
    title_english: englishTitle,
    title_japanese: nativeTitle,
    title_synonyms: media.synonyms || [],
    images: {
      webp: {
        image_url: coverLarge,
        small_image_url: coverSmall,
        large_image_url: coverLarge,
        large_small_url: coverSmall,
      },
      jpg: {
        image_url: coverLarge,
        small_image_url: coverSmall,
        large_image_url: coverLarge,
      },
    },
    bannerImage: media.bannerImage || coverLarge,
    synopsis: media.description
      ? media.description.replace(/<[^>]*>/g, "")
      : "No synopsis available.",
    rating: media.isAdult ? "R - 17+" : "PG-13",
    score: media.averageScore
      ? (media.averageScore / 10).toFixed(1)
      : media.meanScore
      ? (media.meanScore / 10).toFixed(1)
      : "8.0",
    rank: media.rankings?.[0]?.rank || media.popularity || 1,
    favorites: media.favourites || 0,
    members: media.popularity || 0,
    episodes: media.episodes || (media.format === "MOVIE" ? 1 : "?"),
    duration: media.duration ? `${media.duration} min` : "24 min",
    type: media.format || "TV",
    status: media.status ? media.status.replace(/_/g, " ") : "Finished Airing",
    aired: {
      string: media.startDate?.year
        ? `${media.startDate.year}${
            media.endDate?.year && media.endDate.year !== media.startDate.year
              ? ` - ${media.endDate.year}`
              : ""
          }`
        : "Unknown",
    },
    season: media.season || "",
    year: media.seasonYear || media.startDate?.year || "",
    genres: (media.genres || []).map((g, idx) => ({
      mal_id: idx + 1,
      name: g,
    })),
    studios: (media.studios?.nodes || []).map((s, idx) => ({
      mal_id: s.id || idx + 1,
      name: s.name,
    })),
    producers: [],
    licensors: [],
  };
}

export function mapCharacterToJikan(char) {
  if (!char) return null;
  return {
    mal_id: char.id,
    name: char.name?.full || char.name?.native || "Unknown Character",
    url: `https://anilist.co/character/${char.id}`,
    images: {
      webp: {
        image_url: char.image?.large || char.image?.medium || "",
      },
      jpg: {
        image_url: char.image?.large || char.image?.medium || "",
      },
    },
    favorites: char.favourites || 0,
    about: char.description
      ? char.description.replace(/<[^>]*>/g, "").slice(0, 200)
      : "No bio available.",
  };
}

export function mapReviewToJikan(rev) {
  if (!rev) return null;
  return {
    mal_id: rev.id,
    user: {
      username: rev.user?.name || "AnimeFan",
      url: `https://anilist.co/user/${rev.user?.name || ""}`,
      images: {
        webp: {
          image_url:
            rev.user?.avatar?.large ||
            rev.user?.avatar?.medium ||
            "https://s4.anilist.co/file/anilistcdn/user/avatar/large/default.png",
        },
      },
    },
    review: rev.summary || rev.body?.slice(0, 150) || "Great anime!",
    entry: {
      title:
        rev.media?.title?.english ||
        rev.media?.title?.romaji ||
        "Anime Review",
    },
  };
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { extraLarge large medium }
  bannerImage
  episodes
  duration
  averageScore
  meanScore
  format
  genres
  description
  status
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  favourites
  popularity
  isAdult
  synonyms
  studios { nodes { id name } }
`;

export async function fetchTopAiring(limit = 4) {
  const query = `
    query($limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchMostPopular(limit = 4) {
  const query = `
    query($limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchMostFavorite(limit = 4) {
  const query = `
    query($limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, sort: FAVOURITES_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchTopUpcoming(limit = 4) {
  const query = `
    query($limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchAnimeByType(type, limit = 24) {
  const formatMap = {
    movie: "MOVIE",
    tv: "TV",
    ova: "OVA",
    ona: "ONA",
    special: "SPECIAL",
  };
  const format = formatMap[type?.toLowerCase()] || "TV";

  const query = `
    query($format: MediaFormat, $limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, format: $format, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { format, limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchAnimeByFilter(filterName, limit = 24) {
  let sort = ["POPULARITY_DESC"];
  let status = undefined;

  if (filterName === "airing") {
    status = "RELEASING";
  } else if (filterName === "favorite") {
    sort = ["FAVOURITES_DESC"];
  } else if (filterName === "upcoming") {
    status = "NOT_YET_RELEASED";
  }

  const query = `
    query($sort: [MediaSort], $status: MediaStatus, $limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, sort: $sort, status: $status) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { sort, status, limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchGenres() {
  const query = `query { GenreCollection }`;
  const data = await fetchAniList(query);
  return (data.GenreCollection || []).map((name, idx) => ({
    mal_id: idx + 1,
    name,
    count: 1000,
  }));
}

export async function fetchAnimeByGenre(genreName, limit = 24) {
  const query = `
    query($genre: String, $limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, genre: $genre, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { genre: genreName, limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchRecommendedAnime(limit = 24) {
  const query = `
    query($limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, sort: TRENDING_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchRandomAnime() {
  const query = `
    query {
      Page(page: 1, perPage: 25) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query);
  const list = data.Page.media;
  const randomIndex = Math.floor(Math.random() * list.length);
  return mapAniListMediaToJikan(list[randomIndex]);
}

export async function fetchAnimeSearch(name, limit = 24) {
  const query = `
    query($search: String, $limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(type: ANIME, search: $search, sort: SEARCH_MATCH) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchAniList(query, { search: name, limit });
  return data.Page.media.map(mapAniListMediaToJikan);
}

export async function fetchAnimeById(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  // Try querying by MAL ID first, fallback to AniList ID
  const queryMal = `
    query($idMal: Int) {
      Media(idMal: $idMal, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  `;

  try {
    const data = await fetchAniList(queryMal, { idMal: numericId });
    if (data.Media) {
      return mapAniListMediaToJikan(data.Media);
    }
  } catch (err) {
    // If not found by idMal, query by direct AniList id
  }

  const queryAni = `
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  const data = await fetchAniList(queryAni, { id: numericId });
  return mapAniListMediaToJikan(data.Media);
}

export async function fetchTopCharacters(limit = 5) {
  const query = `
    query($limit: Int) {
      Page(page: 1, perPage: $limit) {
        characters(sort: FAVOURITES_DESC) {
          id
          name { full native }
          image { large medium }
          favourites
          description
        }
      }
    }
  `;
  const data = await fetchAniList(query, { limit });
  return data.Page.characters.map(mapCharacterToJikan);
}

export async function fetchAnimeReviews(limit = 10) {
  const query = `
    query($limit: Int) {
      Page(page: 1, perPage: $limit) {
        reviews(sort: RATING_DESC) {
          id
          summary
          body
          rating
          user {
            name
            avatar { large medium }
          }
          media {
            title { romaji english }
          }
        }
      }
    }
  `;
  const data = await fetchAniList(query, { limit });
  return data.Page.reviews.map(mapReviewToJikan);
}
