export const PROXY_CONFIG = {
  proxies: [
    {
      url: 'https://cors-anywhere.herokuapp.com/',
      headers: { 'x-requested-with': 'XMLHttpRequest' },
      responseType: 'raw'
    },
    // {
    //   url: 'https://api.allorigins.win/get?url=',
    //   headers: { 'x-requested-with': 'XMLHttpRequest' },
    //   responseType: { type: 'json', key: 'contents' }
    // },
    {
      url: 'https://api.codetabs.com/v1/proxy?quest=',
      headers: {},
      responseType: 'raw'
    },
    // {
    //   url: 'https://thingproxy.freeboard.io/fetch/',
    //   headers: {},
    //   responseType: 'raw'
    // },
    {
      url: 'https://corsproxy.io/?url=',
      headers: {},
      responseType: 'raw'
    },
    {
      url: 'https://cors.eu.org/',
      headers: {},
      responseType: 'raw'
    },
    // {
    //   url: 'https://cors.bridged.cc/',
    //   headers: { 'x-requested-with': 'XMLHttpRequest' },
    //   responseType: 'raw'
    // },
    // {
    //   url: 'https://www.whateverorigin.org/get?url=',
    //   headers: { 'x-requested-with': 'XMLHttpRequest' },
    //   responseType: { type: 'json', key: 'contents' }
    // },
  ],
  currentProxyIndex: 0,
  proxyStatus: {},
  getCurrent: () => {
    const { proxies, currentProxyIndex } = PROXY_CONFIG;
    if (!proxies || !proxies.length) return null;
    return proxies[currentProxyIndex];
  },
  getNext: () => {
    const { proxies, proxyStatus, currentProxyIndex } = PROXY_CONFIG;
    if (!proxies || !proxies.length) return null;
    for (let i = 0; i < proxies.length; i++) {
      const index = (currentProxyIndex + i) % proxies.length;
      const proxy = proxies[index];
      if (proxyStatus[proxy.url] !== 'failed') {
        PROXY_CONFIG.currentProxyIndex = (index + 1) % proxies.length;
        return proxy;
      }
    }
    const fallbackIndex = (currentProxyIndex + 1) % proxies.length;
    PROXY_CONFIG.currentProxyIndex = (fallbackIndex + 1) % proxies.length;
    return proxies[fallbackIndex];
  },
  markFailed: (proxyUrl) => {
    if (PROXY_CONFIG.proxyStatus[proxyUrl] !== 'failed') {
      PROXY_CONFIG.proxyStatus[proxyUrl] = 'failed';
    }
  },
  markWorking: (proxyUrl) => {
    if (PROXY_CONFIG.proxyStatus[proxyUrl] !== 'working') {
      PROXY_CONFIG.proxyStatus[proxyUrl] = 'working';
    }
  },
  resetStatuses: () => {
    PROXY_CONFIG.proxyStatus = {};
    PROXY_CONFIG.currentProxyIndex = 0;
  }
};