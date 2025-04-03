import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { FaReddit, FaSadTear, FaHeart } from "react-icons/fa"
import { GiFoxHead } from "react-icons/gi";
import { PuffLoader } from "react-spinners"

import useLocalStorage from "./hooks/useLocalStorage"
import { ToastContainer, toast } from 'react-toastify';
import TimeDate from "./components/TimeDate"
import Config from "./components/Config"
import Icons from "./components/Icons"
import Image from "./components/Image"

import AppContext from "./contexts/AppContext"
import Gallery from "./components/Gallery";
import pkg from "../package.json"
import Settings from "./components/Settings";
import "./App.scss"
import imageSources from "./services/imageSources";
export default () => {
  const [data, setData] = useState(undefined)
  const [loaded, setLoaded] = useState(false)
  const sequentialIndex = useRef(0);
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
    fetchLimit: 200,
    orderMode: 'random',
    source: 'reddit'
  })

  const [cache, setCache] = useLocalStorage("cache", {
    lastUpdated: -1,
    data: [],
    source: 'reddit'
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
        source: data.source,
        preview: data.preview,
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
      setConfig(prev => ({ ...prev, num: null }));
      setLoaded(false);
    }
  }, [setGalleryItems, data?.url, setConfig]);

  const handleUseFromGallery = useCallback((item) => {
    console.log("[i] Using from gallery:", item.url);
    setData({
      ...item,
      num: -1,
    });
    setConfig(prev => ({ ...prev, num: `gallery_${item.id}` }));
    setLoaded(true);
    setIsGalleryOpen(false);
  }, [setData, setConfig, setLoaded, setIsGalleryOpen]);

  const getGalleryItem = useCallback((itemId) => {
    return galleryItems.find(item => item?.id === itemId) ?? null;
  }, [galleryItems]);

  const handleImportGallery = useCallback((impItems) => {
    if (!Array.isArray(impItems)) {
      console.error("[!] Import failed: Invalid file format. Expected an array.");
      toast.error("Import failed: The file does not contain a valid gallery array.");
      return;
    }

    setGalleryItems(items => {
      const urls = new Set(items.map(item => item.url));
      let added = 0;
      let skipped = 0;
      
      const newItems = impItems.filter(item => {
        if (!item || typeof item.url !== 'string' || !item.url) {
          skipped++;
          return false;
        }
        
        if (urls.has(item.url)) {
          skipped++;
          return false;
        }
        
        added++;
        return true;
      });
      
      if (newItems.length > 0) {
        console.log(`[+] Added ${newItems.length} new items to gallery.`);
        toast.success(`Import successful!\nAdded: ${newItems.length}\nSkipped (duplicates or invalid): ${skipped}`);
        return [...items, ...newItems];
      } else {
        console.log("[i] No new items were added from the import file.");
        toast.info(`Import finished. No new items added. Skipped: ${skippedCount}`);
        return items;
      }
    });

  }, []);

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
    let sourceId = config.source;
    const isCacheValid = cache.lastUpdated !== -1 && 
                        (!isFetchNeeded || Date.now() - cache.lastUpdated < CACHE_EXPIRY) &&
                        cache.source === sourceId;

    if (isCacheValid) {
      console.log("[i] Using cached posts")
      posts = cache.data
    } else {
      console.log("[i] Fetching w/ config:", config)
      sequentialIndex.current = 0;
      let after = null
      const allPosts = []

      while (allPosts.length < config.fetchLimit) {
        const selectedSource = imageSources[sourceId];
        const url = selectedSource.buildUrl(config, after);
        try {
          const res = await fetch(url)
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`)
          }
          const { posts: newPosts, after: nextPage } = await selectedSource.parseResponse(config, res, after);
          if (!nextPage) break
          allPosts.push(...newPosts)
          after = nextPage;
        } catch (error) {
          console.error("Error fetching data:", error)
          setData(null)
          setLoaded(true)
          return
        }
      }

      posts = allPosts

      setCache({ lastUpdated: Date.now(), data: posts, source: sourceId })
    }

    if (!posts.length) {
      setData(null);
      setLoaded(true);
      return;
    }

    let num;
    if (config.orderMode === "sequential") {
      num = sequentialIndex.current % posts.length;
      sequentialIndex.current += 1;
    } else {
      num = config.num || Math.floor(Math.random() * posts.length);
    }

    if (typeof config.num === "string" && config.num.includes("gallery_")) {
      const data = getGalleryItem(num.replace("gallery_", ""))
      sourceId = data.source || 'reddit';
      const selectedSource = imageSources[sourceId];
      const info = await selectedSource.parseInfo(data);
      setData({
        title: info.title,
        res: info.res || "",
        url: info.url,
        link: data.link,
        num,
        isNsfw: info.isNsfw,
        source: data.source,
        preview: info.preview === null ? undefined : info.preview,
      })
      setLoaded(true)
      return
    }

    const post = posts[num];
    console.log("[i] Loading post:", post)
    sourceId = post.source || 'reddit';
    const selectedSource = imageSources[sourceId];
    const info = await selectedSource.parseInfo(post);

    setData({
      title: info.title,
      res: info.res || "",
      url: info.url,
      link: post.link,
      num,
      isNsfw: info.nsfw,
      source: post.source,
      preview: info.preview === null ? undefined : info.preview,
    });

    setLoaded(true);
    
  }, [config, cache, setCache, setData, setLoaded]);

  useEffect(() => {
    if (loaded || config.incognito) return

    setLoaded(false)

    fetchData()
  }, [config.incognito, loaded]);

  

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
        handleImportGallery
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
              <Settings />
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
                    <a href={
                      data?.source === 'reddit' ? 
                        data?.isNsfw ? "https://reddit.com/r/AnimeWallpaperNSFW" : "https://reddit.com/r/Animewallpaper"
                      : "https://anime-pictures.net"
                    }>
                      {data?.source === 'reddit' ? <FaReddit size={20} /> : <GiFoxHead size={20} />}
                      {data?.source === 'reddit' ? (
                        `r/${data?.isNsfw ? "AnimeWallpaperNSFW" : "Animewallpaper"}`
                      ) : (
                        "Anime Pictures"
                      )}
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
                <a href="https://github.com/x1dse/atarashii-tab">
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
