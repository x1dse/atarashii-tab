import React, { useState, useEffect, useCallback, useMemo } from "react"
import { decode } from "html-entities"
import { FaReddit, FaSadTear, FaHeart } from "react-icons/fa"
import { PuffLoader } from "react-spinners"

import useLocalStorage from "./hooks/useLocalStorage"
import { ToastContainer } from 'react-toastify';
import TimeDate from "./components/TimeDate"
import Config from "./components/Config"
import Icons from "./components/Icons"
import Image from "./components/Image"

import AppContext from "./contexts/AppContext"
import Gallery from "./components/Gallery";
import pkg from "../package.json"

import "./App.scss"

export default () => {
  const [data, setData] = useState(undefined)
  const [loaded, setLoaded] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [config, setConfig] = useLocalStorage("config", {
    num: null,
    q: "Desktop",
    sort: "top",
    t: "year",
    nsfw: false,
    theme: {
      primary: "#ffc400",
    },
    hideGui: false,
  })

  const [cache, setCache] = useLocalStorage("cache", {
    lastUpdated: -1,
    data: [],
  })

  const [galleryItems, setGalleryItems] = useLocalStorage("galleryItems", []);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  const themeStyle = useMemo(() => ({
    "--primary": config.theme.primary,
  }), [config.theme.primary]);

  useEffect(() => {
    for (const property in themeStyle) {
      document.documentElement.style.setProperty(property, themeStyle[property]);
    }
  }, [themeStyle]);

  const handleSaveToGallery = useCallback(() => {
    if (!data || data.source === 'gallery' || config.incognito) return;

    const alreadyExists = galleryItems.some(item => item.url === data.url);
    if (!alreadyExists) {
      const simpleHash = (str) => str.split('').reduce((h, c) => h + c.charCodeAt(), 0).toString(16).slice(0, 5);
      const galleryItem = {
        id: simpleHash(data.url),
        url: data.url,
        title: data.title,
        res: data.res,
        link: data.link,
        isNsfw: data.isNsfw,
      };
      setGalleryItems(prevItems => [...prevItems, galleryItem]);
      console.log("[+] Saved to gallery:", galleryItem.url);
    } else {
       console.log("[i] Item already in gallery:", data.url);
    }
  }, [data, galleryItems, setGalleryItems, config.incognito]);

  const handleRemoveFromGallery = useCallback((urlToRemove) => {
    setGalleryItems(prevItems => prevItems.filter(item => item.url !== urlToRemove));
    console.log("[-] Removed from gallery:", urlToRemove);
    if (data?.url === urlToRemove) {
      setConfig(prev => ({...prev, num: null}));
      setLoaded(false);
    }
  }, [setGalleryItems, data?.url, setConfig]);

  const handleUseFromGallery = useCallback((item) => {
    console.log("[i] Using from gallery:", item.url);
    setData({
      ...item,
      source: 'gallery',
      num: -1,
    });
    setConfig(prev => ({ ...prev, num: `gallery_${item.id}` }));
    setLoaded(true);
    setIsGalleryOpen(false);
  }, [setData, setConfig, setLoaded, setIsGalleryOpen]);

  const getGalleryItem = useCallback((itemId) => {
    return galleryItems.find(item => item?.id === itemId) ?? null;
  }, [galleryItems]);

  useEffect(() => {
    if (!loaded) return;
    const bgElement = document.querySelector('.bg');
    if (!bgElement) {
      console.warn("[!] Background element (.bg) not found.");
      return;
    }
    bgElement.style.objectFit = 'cover';
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        bgElement.style.objectFit = 
          bgElement.style.objectFit === 'cover' ? 'contain' : 'cover';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loaded]);

  const fetchData = useCallback(async () => {
    const isFetchNeeded = config.num === null || typeof config.num === 'number';
    const CACHE_EXPIRY = 1000 * 60 * 60 * 24
    let posts = []
    const isCacheValid = cache.lastUpdated !== -1 && (!isFetchNeeded || Date.now() - cache.lastUpdated < CACHE_EXPIRY)

    if (isCacheValid) {
      console.log("[i] Using cached posts")
      posts = cache.data
    } else {
      console.log("[i] Fetching w/ config:", config)

      let after = null
      const allPosts = []

      while (allPosts.length < 200) {
        const query = new URLSearchParams({
          q: `flair:"${config.q}"`,
          sort: config.sort,
          t: config.t,
          show: "all",
          restrict_sr: 1,
          include_over_18: config.nsfw ? "on" : undefined,
          after,
        })

        const subr = config.nsfw ? "AnimewallpaperNSFW" : "Animewallpaper"
        //url = `https://www.reddit.com/r/${subr}/search.json?${query}` broken
        let url

        if (config.q.includes("All")) {
          query.delete("q")
          url = `https://www.reddit.com/r/${subr}/.json?${query}`
        } else {
          url = `https://www.reddit.com/r/${subr}/search.json?${query}`
        }

        try {
          const res = await fetch(url)
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`)
          }
          const json = await res.json()

          after = json.data.after
          if (!after) break

          const newPosts = json.data.children.map((e) => e.data)
          allPosts.push(...newPosts)
        } catch (error) {
          console.error("Error fetching data:", error)
          setData(null)
          setLoaded(true)
          return
        }
      }

      posts = allPosts
        .filter((e) => config.nsfw || !e.over_18)
        .filter((e) => e.url.includes("i.redd.it"))

      setCache({ lastUpdated: Date.now(), data: posts })
    }

    if (!posts.length) {
      setData(null)
      setLoaded(true)
      return
    }

    const num = config.num || Math.floor(Math.random() * posts.length)
    if (typeof config.num === "string" && config.num.includes("gallery_")) {
      const data = getGalleryItem(num.replace("gallery_", ""))
      setData(data)
      setLoaded(true)
      return
    }
    const post = posts[num]
    const link = `https://redd.it/${post.id}`

    console.log("[i] Loading post:", post)

    const rawTitle = decode(post.title)

    const matchedTags = rawTitle.match(/\[.*?\]|\(.*?\)|\{.*?\}/g);
    let parts = [];
    let title = rawTitle;

    if (matchedTags) {
      parts = matchedTags
        .map(tag => tag.slice(1, -1).trim())
        .filter(part => part);

      title = rawTitle.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, "").trim();
    } else if (title.toLowerCase().includes("remove")) {
      title = ""
    }

    let resolution = parts.find((e) => {
      const match = e.match(/[\d\s]+[xX×*][\d\s]+/g);
      if (match) {
        const matchedText = match[0];
        return matchedText.length >= 4 && (matchedText.match(/\d/g) || []).length >= 2;
      }
      return false;
    });

    if (resolution) {
      parts.splice(parts.indexOf(resolution), 1)
      resolution = resolution.split(/[xX×*]/).join(" × ")
    } else {
      const resolutionMatch = title.match(/(\d+)[xX×*](\d+)/);
      if (resolutionMatch) {
        resolution = `${resolutionMatch[1]} × ${resolutionMatch[2]}`;
        title = title.replace(/(\d+)[xX×*](\d+)/, "").trim();
      }
    }

    const processedTitle = title ? [title, ...parts].join(" • ") : parts.join(" • ")

    setData({
      title: processedTitle,
      res: resolution || "",
      url: post.url,
      link,
      num,
      isNsfw: post.over_18,
    })

    setLoaded(true)
  }, [config, cache, setCache, setData, setLoaded])

  useEffect(() => {
    if (loaded || config.incognito) return

    setLoaded(false)
    fetchData()
  }, [config.incognito, loaded, fetchData])

  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        cache,
        setCache,
        config,
        setConfig,
        loaded,
        setLoaded,
        galleryItems, setGalleryItems,
        isGalleryOpen, setIsGalleryOpen,
        handleSaveToGallery,
        handleRemoveFromGallery,
        handleUseFromGallery,
      }}
    >
      <div
        className={
          ((!config.incognito && loaded) ? "load" : "") + " " + (config.hideGui ? "hidden" : "")
        }
      >
        <div className="content">
          <header>
            <div className="header-left">
              <TimeDate />

              <div className="details hideable">
                <p className="to-load to-delay-1">{data?.title}</p>
                <p className="to-load to-delay-2">{data?.res}</p>
              </div>

              {data && <Icons link={data.link} url={data.url} />}
            </div>

            <div className="header-right to-right">
              <Config />
            </div>
          </header>

          <footer className="to-bottom hideable">
            <div className="attr">
              <p className="attr-from to-load to-delay-3">
                {data === null ? (
                  <strong>
                    No images found <FaSadTear size={20} />
                  </strong>
                ) : (
                  <>
                    Image from{" "}
                    <a href={data?.isNsfw ? "https://reddit.com/r/AnimeWallpaperNSFW" : "https://reddit.com/r/Animewallpaper"}>
                      <FaReddit size={20} />
                      r/{data?.isNsfw ? "AnimeWallpaperNSFW" : "Animewallpaper"}
                    </a>
                  </>
                )}
              </p>

              <p className="attr-bottom to-load to-delay-4">
                {data === null ? (
                  <>Try different filters! • Reddit down perhaps?</>
                ) : (
                  <>
                    Post <strong>#{data?.num + 1}</strong> of{" "}
                    <strong>{cache.data.length}</strong> •{" "}
                    <a href={data?.link}>{data?.link}</a>
                  </>
                )}
              </p>

              {!loaded && !config.incognito && (
                <span className="attr-loader">
                  <PuffLoader color="white" size={24} />
                </span>
              )}
            </div>

            <div className="credits to-right">
              <p>
                Created with <FaHeart /> •{" "}
                <a href="https://github.com/cf12/atarashii-tab">
                  v{pkg.version}
                </a>
              </p>
            </div>
          </footer>
        </div>
        {data === null ? null : (
          <Image
            className="bg to-load-bg"
            src={data?.url}
            alt=""
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
      <ToastContainer />
      <Gallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
    </AppContext.Provider>
  )
}
