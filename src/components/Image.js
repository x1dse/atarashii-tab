import React, { useState, useEffect } from "react"
import NProgress from "nprogress/nprogress.js"

const PROXY_URL = "https://cors-anywhere.herokuapp.com/";

export default ({ src, ...props }) => {
  const [loadedSrc, setLoadedSrc] = useState(null)
  
  useEffect(() => {
    // Reset loadedSrc when src changes to ensure fresh load
    setLoadedSrc(null)
    
    if (!src) return;
    
    const proxySrc = `${PROXY_URL}${src}`;
    const xmlHTTP = new XMLHttpRequest();
    xmlHTTP.open("GET", proxySrc, true);
    xmlHTTP.responseType = "arraybuffer";
    
    xmlHTTP.onerror = () => {
      console.error("Error loading image:", src);
      NProgress.done();
    };
    
    xmlHTTP.timeout = 10000;
    xmlHTTP.ontimeout = () => {
      console.warn("Timeout loading image:", src);
      NProgress.done();
    };
    
    xmlHTTP.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        NProgress.done();
        setLoadedSrc(window.URL.createObjectURL(new Blob([this.response])));
      } else {
        console.error("HTTP error loading image:", this.status, src);
        NProgress.done();
      }
    };
    
    xmlHTTP.onprogress = (e) => {
      if (e.lengthComputable) {
        NProgress.set(e.loaded / e.total);
      }
    };
    
    xmlHTTP.onloadstart = () => {
      NProgress.start();
    };
    
    xmlHTTP.send();
    
    return () => {
      xmlHTTP.abort();
      // Clean up the object URL if it exists
      if (loadedSrc) {
        window.URL.revokeObjectURL(loadedSrc);
      }
    };
  }, [src]);
  
  return <img src={loadedSrc} {...props} />;
};