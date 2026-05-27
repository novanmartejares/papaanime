import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import HlsVideoPlayer from "./HlsVideoPlayer";
import "../../main.css";
import "./watch-anime.css";
import loadingImage from "../../media/placeholder.gif";
import RecommendedTopTen from "../../Layouts/RecommendedTopTen";
import Share from "../../components/Share/Share";
import LoadingSpinner from "../../components/LoadingSpinner";
import { easeOut, motion } from "framer-motion";

import Error from "../../components/AnimeNotFound/Error";
import {
  useAnimeInfo,
  useEpisodeFiles,
  useSearch,
  useServers,
} from "../../hooks/useConsumet";

export default function WatchAnime() {
  const [descIsCollapsed, setDescIsCollapsed] = useState(true);
  const [searchParams] = useSearchParams();

  // 1. Fetch search results
  const searchResults = useSearch(searchParams.get("name"));
  
  // 2. Fetch anime info (uses the single AniList ID)
  const animeData = useAnimeInfo(searchResults?.anime?.id || null);

  const [subIsSelected, setSubIsSelected] = useState(true);
  const [animeInfo, setAnimeInfo] = useState({});
  const [selectedProviderIdx, setSelectedProviderIdx] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [quality, setQuality] = useState("default");

  useEffect(() => {
    if (animeData && !animeData.isLoading && animeData.id !== animeInfo.id) {
      setAnimeInfo(animeData);
      setSelectedProviderIdx(0);
      setSelectedEpisode(0);
      setSubIsSelected(true);
    }
  }, [animeData, animeInfo.id]);

  // Determine sub/dub episodes from the CURRENT provider
  const providers = useServers(animeInfo?.providers);
  const currentProviderName = providers?.[selectedProviderIdx]?.id;
  const currentProviderData = animeInfo?.allEpisodes?.[currentProviderName]?.episodes || {};
  
  const subEpisodes = currentProviderData.sub || [];
  const dubEpisodes = currentProviderData.dub || [];

  // Auto-switch to dub if sub doesn't exist, and vice versa
  useEffect(() => {
    if (subIsSelected && subEpisodes.length === 0 && dubEpisodes.length > 0) {
      setSubIsSelected(false);
    } else if (!subIsSelected && dubEpisodes.length === 0 && subEpisodes.length > 0) {
      setSubIsSelected(true);
    }
  }, [subEpisodes, dubEpisodes, subIsSelected]);

  const episodeList = subIsSelected ? subEpisodes : dubEpisodes;

  // 3. Fetch episode streaming URLs
  const currentEpisodeId = episodeList?.[selectedEpisode]?.id;
  const episodesData = useEpisodeFiles(currentEpisodeId);

  // Auto-failover to next provider if streaming fails
  useEffect(() => {
    if (episodesData && !episodesData.isLoading) {
      if (episodesData.isError || (episodesData.sources && episodesData.sources.length === 0)) {
        if (providers && selectedProviderIdx < providers.length - 1) {
          setSelectedProviderIdx(prev => prev + 1);
          setSelectedEpisode(0);
        }
      }
    }
  }, [episodesData, selectedProviderIdx, providers?.length]);

  const episodeQuality = episodesData?.sources?.map((el) => {
    return { quality: el.quality, url: el.url, type: el.type };
  });

  // Server and episode buttons to change the respective item
  const serverButtons = providers?.map((el, idx) => {
    return (
      <span
        className={`server-tile ${selectedProviderIdx === idx ? "selected" : ""}`}
        key={el.name}
        onClick={() => {
          setSelectedProviderIdx(idx);
          setSelectedEpisode(0); // reset episode when changing provider
        }}
      >
        {el.name}
      </span>
    );
  });

  const episodeButtons = episodeList?.map((el, idx) => {
    return (
      <span
        className={`episode-tile ${idx === selectedEpisode ? "selected" : ""}`}
        key={el.id}
        style={
          episodeList.length < 10 ? { minWidth: "100%", borderRadius: 0 } : null
        }
        onClick={() => setSelectedEpisode(idx)}
      >
        {episodeList.length < 10 ? ` Episode: ` + el.number : el.number}
      </span>
    );
  });

  const qualityButtons = episodeQuality?.map((el) => {
    return (
      <option
        key={el.quality}
        style={{ color: "white" }}
        className={`episode-tile ${el.quality === quality ? "selected" : ""}`}
        value={el.quality}
      >
        {el.quality.toUpperCase()}
      </option>
    );
  });

  if (searchResults?.noAnime) {
    return <Error />;
  }

  // Find selected source, fallback to first available
  const currentSource = episodeQuality?.find((el) => el.quality === quality) || episodeQuality?.[0];
  const currentUrl = currentSource?.url;
  const currentType = currentSource?.type;

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
            src={animeInfo?.image}
          />
          <div className="media-center d-flex">
            <div className="episode-container">
              <p>List of Episodes:</p>
              <div className="episode-tiles-wrapper d-flex a-center">
                {episodeList?.length > 0 ? episodeButtons : <LoadingSpinner />}
              </div>
            </div>

            <div className="video-player">
              <div className="hls-container">
                {episodesData?.isLoading ? (
                  <div className="d-flex a-center j-center" style={{ height: "100%" }}>
                    <img src={loadingImage} style={{ display: "block", height: 100, width: 100, margin: "auto" }} />
                  </div>
                ) : currentUrl ? (
                  <HlsVideoPlayer url={currentUrl} type={currentType} />
                ) : (
                  <div className="d-flex a-center j-center" style={{ height: "100%", color: "white" }}>
                    No video sources available. Try another provider or episode.
                  </div>
                )}
              </div>

              <div className="server-container d-flex-fd-column">
                <div className="server-tile-wrapper d-flex-fd-column">
                  <div>
                    Language Preference:{" "}
                    {dubEpisodes?.length > 0 && selectedEpisode < dubEpisodes.length && (
                      <span
                        className={`server-tile ${!subIsSelected ? "selected" : ""}`}
                        onClick={() => setSubIsSelected(false)}
                      >
                        Dub
                      </span>
                    )}
                    {subEpisodes?.length > 0 && selectedEpisode < subEpisodes.length && (
                      <span
                        className={`server-tile ${subIsSelected ? "selected" : ""}`}
                        onClick={() => setSubIsSelected(true)}
                      >
                        Sub
                      </span>
                    )}
                  </div>
                  <div>
                    Servers (Providers):{" "}
                    {providers?.length > 0 ? serverButtons : <img src={loadingImage} style={{ height: 100, width: 100 }} />}
                  </div>
                  {episodeQuality?.length > 0 && (
                    <div>
                      Quality:
                      <select
                        style={{ width: "100px", marginLeft: 10, background: "var(--theme)" }}
                        className={`episode-tile`}
                        onChange={(e) => setQuality(e.target.value)}
                        value={quality}
                      >
                        <option value="default">Default</option>
                        {qualityButtons}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="current-anime-details ">
            <img className="details-container-background" src={animeInfo.image || "NA"} />
            <div className="anime-details d-flex-fd-column">
              <img className="anime-details-poster" src={animeInfo.image || "NA"} />

              <div className="anime-details-content d-flex-fd-column">
                <h1 style={{ textAlign: "center" }} className="title-large">
                  {animeInfo.title}
                </h1>

                <p>
                  {descIsCollapsed
                    ? animeInfo.description?.slice(0, 150) + "..."
                    : animeInfo.description}
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => setDescIsCollapsed((prev) => !prev)}
                  >
                    [ {descIsCollapsed ? "More" : "Less"} ]
                  </span>
                </p>
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
