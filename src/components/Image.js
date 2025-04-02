import React, { useState, useEffect } from "react"
import NProgress from "nprogress/nprogress.js"
import { toast } from 'react-toastify';
//By simply installing a cors extension, you avoid this problem.
export default ({ src, ...props }) => {
  const [loadedSrc, setLoadedSrc] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
 
  useEffect(() => {
    // Reset loadedSrc and retryCount when src changes to ensure fresh load
    setLoadedSrc(null)
    setRetryCount(0)
   
    if (!src) return;
   
    const loadImage = () => {
      const xmlHTTP = new XMLHttpRequest();
      xmlHTTP.open("GET", src, true);
      xmlHTTP.responseType = "arraybuffer";
      
      xmlHTTP.onerror = () => {
        console.error("Error loading image:", src);
        NProgress.done();
        toast.error(
          "Error loading image due to CORS. Please install a CORS extension.",
          {
            position: "top-right",
            autoClose: 5000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      };
      
      xmlHTTP.timeout = 60000;
      xmlHTTP.ontimeout = () => {
        console.warn("Timeout loading image:", src);
        NProgress.done();
      };
      
      xmlHTTP.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          NProgress.done();
          setLoadedSrc(window.URL.createObjectURL(new Blob([this.response])));
        } else if (this.status === 429 && retryCount < MAX_RETRIES) {
          NProgress.done();
          toast.info(
            `Rate limit exceeded. Retrying in ${RETRY_DELAY/1000} seconds (${retryCount + 1}/${MAX_RETRIES})`,
            {
              position: "top-right",
              autoClose: RETRY_DELAY,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
          
          setRetryCount(prevCount => prevCount + 1);
          setTimeout(loadImage, RETRY_DELAY);
        } else {
          console.error("HTTP error loading image:", this.status, src);
          NProgress.done();
          
          if (this.status === 429) {
            toast.error(
              `Rate limit exceeded. Max retries (${MAX_RETRIES}) reached.`,
              {
                position: "top-right",
                autoClose: 5000,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              }
            );
          }
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
      
      return xmlHTTP;
    };
    
    const xmlHTTP = loadImage();
    
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