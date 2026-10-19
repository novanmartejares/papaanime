import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import HlsVideoPlayer from "./HlsVideoPlayer";
import "../../main.css";
import "./watch-anime.css";
import loadingImage from "../../media/placeholder.gif";
import RecommendedTopTen from "../../Layouts/RecommendedTopTen";
import Share from "../../components/Share/Share";
import LoadingSpinner from "../../components/LoadingSpinner";
import { easeOut, motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaTv } from "react-icons/fa";

import Error from "../../components/AnimeNotFound/Error";
import {
  useAnimeInfo,
  useEpisodeFiles,
  useSearch,
  useServers,
} from "../../hooks/useConsumet";

const EPISODES_PER_CHUNK = 50;

export default function WatchAnime() {
  const [descIsCollapsed, setDescIsCollapsed] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const queryName = searchParams.get("name") || "";
  const queryId = searchParams.get("id");
  const queryEp = parseInt(searchParams.get("ep"), 10) || 1;

  // 1. Fetch search results or lookup by ID
  const effectiveName = queryName || (queryId ? "" : "Demon Slayer");
  const searchResults = useSearch(effectiveName);

  // If queryId is provided, use it directly, otherwise take first search result
  const targetId = queryId || searchResults?.anime?.id || null;
  const animeData = useAnimeInfo(targetId);

  const [subIsSelected, setSubIsSelected] = useState(true);
  const [animeInfo, setAnimeInfo] = useState({});
  const [selectedProviderIdx, setSelectedProviderIdx] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState(
    Math.max(0, queryEp - 1)
  );
  const [episodeChunkIndex, setEpisodeChunkIndex] = useState(0);

  useEffect(() => {
    if (animeData && !animeData.isLoading && animeData.id !== animeInfo.id) {
      setAnimeInfo(animeData);
      setSelectedProviderIdx(0);
      const initialEp = Math.max(0, queryEp - 1);
      setSelectedEpisode(initialEp);
      setEpisodeChunkIndex(Math.floor(initialEp / EPISODES_PER_CHUNK));
      setSubIsSelected(true);
    }
  }, [animeData, animeInfo.id, queryEp]);

  // Determine sub/dub episodes from the CURRENT provider
  const providers = useServers(animeInfo?.providers);
  const currentProviderName =
    providers?.[selectedProviderIdx]?.id || "megaplay";
  const currentProviderData =
    animeInfo?.allEpisodes?.[currentProviderName]?.episodes || {};

  const subEpisodes = currentProviderData.sub || animeInfo?.subEpisodes || [];
  const dubEpisodes = currentProviderData.dub || animeInfo?.dubEpisodes || [];

  // Auto-switch to dub if sub doesn't exist, and vice versa
  useEffect(() => {
    if (subIsSelected && subEpisodes.length === 0 && dubEpisodes.length > 0) {
      setSubIsSelected(false);
    } else if (
      !subIsSelected &&
      dubEpisodes.length === 0 &&
      subEpisodes.length > 0
    ) {
      setSubIsSelected(true);
    }
  }, [subEpisodes.length, dubEpisodes.length, subIsSelected]);

  const episodeList = subIsSelected ? subEpisodes : dubEpisodes;

  // Sync selected episode with URL parameter smoothly
  const handleSelectEpisode = (epIdx) => {
    setSelectedEpisode(epIdx);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("ep", String(epIdx + 1));
    if (animeInfo.title) {
      newParams.set("name", animeInfo.title);
    }
    setSearchParams(newParams, { replace: true });
  };

  // 3. Fetch episode streaming URLs
  const currentEpNum = selectedEpisode + 1;
  const episodesData = useEpisodeFiles(
    currentEpNum,
    animeInfo?.id,
    animeInfo?.idMal,
    currentProviderName,
    !subIsSelected
  );

  const episodeQuality = episodesData?.sources?.map((el) => {
    return { quality: el.quality, url: el.url, type: el.type };
  });

  const currentSource = episodeQuality?.[0];
  const currentUrl = currentSource?.url;
  const currentType = currentSource?.type || "embed";

  // Provider / Server buttons
  const serverButtons = providers?.map((el, idx) => {
    return (
      <span
        className={`server-tile ${
          selectedProviderIdx === idx ? "selected" : ""
        }`}
        key={el.id || el.name}
        onClick={() => {
          setSelectedProviderIdx(idx);
        }}
      >
        {el.name}
      </span>
    );
  });

  // Episode range chunks for long anime (e.g. One Piece)
  const totalEpisodesCount = episodeList?.length || 0;
  const totalChunks = Math.ceil(totalEpisodesCount / EPISODES_PER_CHUNK);

  const visibleEpisodes = useMemo(() => {
    if (totalEpisodesCount <= EPISODES_PER_CHUNK) return episodeList;
    const start = episodeChunkIndex * EPISODES_PER_CHUNK;
    return episodeList.slice(start, start + EPISODES_PER_CHUNK);
  }, [episodeList, episodeChunkIndex, totalEpisodesCount]);

  const episodeButtons = visibleEpisodes?.map((el) => {
    const isCurrent = el.number === currentEpNum;
    return (
      <span
        className={`episode-tile ${isCurrent ? "selected" : ""}`}
        key={el.id || el.number}
        onClick={() => handleSelectEpisode(el.number - 1)}
      >
        {el.number}
      </span>
    );
  });

  if (searchResults?.noAnime && !queryId) {
    return <Error />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ x: [window.innerWidth / 2, 0], opacity: 1 }}
      transition={{ duration: 0.7, ease: easeOut }}
    >
      {Object.keys(animeInfo).length > 0 && !animeData?.isError ? (
        <div style={{ marginTop: "65px" }} className="watch-container d-flex">
          <img
            className="watch-container-background"
            src={animeInfo?.bannerImage || animeInfo?.image}
            alt="background"
          />
          <div className="media-center d-flex">
            <div className="episode-container">
              <div className="d-flex a-center j-between" style={{ marginBottom: "8px" }}>
                <p style={{ margin: 0 }}>List of Episodes:</p>
                <span style={{ fontSize: "12px", color: "var(--grey)" }}>
                  Total: {totalEpisodesCount}
                </span>
              </div>

              {totalChunks > 1 && (
                <div
                  className="d-flex"
                  style={{
                    overflowX: "auto",
                    gap: "6px",
                    paddingBottom: "8px",
                    marginBottom: "8px",
                  }}
                >
                  {Array.from({ length: totalChunks }, (_, idx) => {
                    const start = idx * EPISODES_PER_CHUNK + 1;
                    const end = Math.min(
                      (idx + 1) * EPISODES_PER_CHUNK,
                      totalEpisodesCount
                    );
                    const isChunkSelected = episodeChunkIndex === idx;
                    return (
                      <button
                        key={idx}
                        className="server-tile"
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                          margin: 0,
                          backgroundColor: isChunkSelected
                            ? "var(--theme)"
                            : "rgba(255,255,255,0.08)",
                          color: isChunkSelected ? "#000" : "#fff",
                        }}
                        onClick={() => setEpisodeChunkIndex(idx)}
                      >
                        {start}-{end}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="episode-tiles-wrapper d-flex a-center">
                {episodeList?.length > 0 ? (
                  episodeButtons
                ) : (
                  <LoadingSpinner />
                )}
              </div>
            </div>

            <div className="video-player">
              <div className="hls-container">
                {episodesData?.isLoading ? (
                  <div
                    className="d-flex a-center j-center"
                    style={{ height: "100%" }}
                  >
                    <img
                      src={loadingImage}
                      alt="loading"
                      style={{
                        display: "block",
                        height: 100,
                        width: 100,
                        margin: "auto",
                      }}
                    />
                  </div>
                ) : currentUrl ? (
                  <HlsVideoPlayer url={currentUrl} type={currentType} />
                ) : (
                  <div
                    className="d-flex a-center j-center"
                    style={{ height: "100%", color: "white" }}
                  >
                    No video sources available. Try another server or episode.
                  </div>
                )}
              </div>

              {/* Prev / Next Episode Controls Bar */}
              <div
                className="d-flex a-center j-between"
                style={{
                  padding: "10px 0",
                  gap: "10px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <button
                  className="server-tile"
                  disabled={selectedEpisode <= 0}
                  style={{
                    opacity: selectedEpisode <= 0 ? 0.4 : 1,
                    cursor: selectedEpisode <= 0 ? "not-allowed" : "pointer",
                    margin: 0,
                  }}
                  onClick={() => {
                    if (selectedEpisode > 0) {
                      handleSelectEpisode(selectedEpisode - 1);
                    }
                  }}
                >
                  <FaChevronLeft style={{ marginRight: 6 }} size={11} /> Prev Ep
                </button>

                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>
                  Now Playing: Episode {currentEpNum}
                </span>

                <button
                  className="server-tile"
                  disabled={selectedEpisode >= totalEpisodesCount - 1}
                  style={{
                    opacity:
                      selectedEpisode >= totalEpisodesCount - 1 ? 0.4 : 1,
                    cursor:
                      selectedEpisode >= totalEpisodesCount - 1
                        ? "not-allowed"
                        : "pointer",
                    margin: 0,
                  }}
                  onClick={() => {
                    if (selectedEpisode < totalEpisodesCount - 1) {
                      handleSelectEpisode(selectedEpisode + 1);
                    }
                  }}
                >
                  Next Ep <FaChevronRight style={{ marginLeft: 6 }} size={11} />
                </button>
              </div>

              <div className="server-container d-flex-fd-column">
                <div className="server-tile-wrapper d-flex-fd-column">
                  <div>
                    Language Preference:{" "}
                    <span
                      className={`server-tile ${
                        subIsSelected ? "selected" : ""
                      }`}
                      onClick={() => setSubIsSelected(true)}
                    >
                      Sub
                    </span>
                    <span
                      className={`server-tile ${
                        !subIsSelected ? "selected" : ""
                      }`}
                      onClick={() => setSubIsSelected(false)}
                    >
                      Dub
                    </span>
                  </div>
                  <div>
                    Streaming Servers:{" "}
                    {providers?.length > 0 ? (
                      serverButtons
                    ) : (
                      <img
                        src={loadingImage}
                        alt="loading"
                        style={{ height: 50, width: 50 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="current-anime-details">
            <div className="anime-details d-flex-fd-column">
              <img
                className="anime-details-poster"
                src={animeInfo.image || "NA"}
                alt={animeInfo.title}
              />

              <div className="anime-details-content d-flex-fd-column">
                <h1
                  style={{ textAlign: "center", fontSize: "20px" }}
                  className="title-large"
                >
                  {animeInfo.title}
                </h1>

                <p style={{ marginTop: "12px", lineHeight: "1.6" }}>
                  {descIsCollapsed
                    ? animeInfo.description?.slice(0, 160) + "..."
                    : animeInfo.description}
                  <span
                    style={{
                      cursor: "pointer",
                      color: "var(--theme)",
                      marginLeft: "6px",
                      fontWeight: 600,
                    }}
                    onClick={() => setDescIsCollapsed((prev) => !prev)}
                  >
                    [ {descIsCollapsed ? "More" : "Less"} ]
                  </span>
                </p>

                {animeInfo.id && (
                  <Link
                    to={`/details/jikan/${animeInfo.idMal || animeInfo.id}`}
                    className="btn-secondary hero-button"
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      textDecoration: "none",
                    }}
                  >
                    <FaTv size={14} /> Full Anime Details
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : animeData?.isError || searchResults?.noAnime ? (
        <Error />
      ) : (
        <LoadingSpinner />
      )}

      <Share style={{ paddingInline: 20 }} />
      <RecommendedTopTen />
    </motion.div>
  );
}
