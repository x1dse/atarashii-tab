import { decode } from 'html-entities';

const redditItem = (post) => {
    const link = `https://redd.it/${post.id}`;
    const rawTitle = decode(post.title);
    const tagRegex = /\[.*?\]|\(.*?\)|\{.*?\}/g;
    const tags = (rawTitle.match(tagRegex) || []).map(tag => tag.slice(1, -1).trim()).filter(Boolean);
    let title = rawTitle.replace(tagRegex, '').trim();

    if (title.toLowerCase().includes('remove')) {
        title = '';
    }

    let resolution = tags.find(part => {
        const match = part.match(/[\d\s]+[xX×*][\d\s]+/g);
        return match && match[0].length >= 4 && (match[0].match(/\d/g) || []).length >= 2;
    });

    if (resolution) {
        tags.splice(tags.indexOf(resolution), 1);
        resolution = resolution.split(/[xX×*]/).join(' × ');
    } else {
        const resMatch = title.match(/(\d+)[xX×*](\d+)/);
        if (resMatch) {
            resolution = `${resMatch[1]} × ${resMatch[2]}`;
            title = title.replace(resMatch[0], '').trim();
        }
    }

    const processedTitle = title ? [title, ...tags].join(' • ') : tags.join(' • ');

    return {
        id: post.id,
        title: processedTitle,
        res: resolution || '',
        url: post.url,
        link,
        isNsfw: post.over_18,
        source: 'reddit',
    };
};

const titleFromTags = (tags) => {
    if (!tags?.length || !tags[0]?.tag?.type) return '';

    const filteredTags = tags.filter(tag => ![2, 4, 7].includes(tag.tag?.type));
    if (!filteredTags.length) return '';

    const initialType = filteredTags[0].tag.type;
    const diffTypeIndex = filteredTags.findIndex((item, i) => i > 0 && item.tag?.type !== initialType);
    const sliceEnd = diffTypeIndex === -1 ? filteredTags.length : diffTypeIndex + 1;
    const sameTypeTags = filteredTags.slice(0, sliceEnd);

    const refTag = sameTypeTags.reduce((prev, curr) => {
        const prevTagStr = prev.tag?.tag || '';
        const currTagStr = curr.tag?.tag || '';
        const prevWordCount = prevTagStr.split(/\s+/).filter(Boolean).length;
        const currWordCount = currTagStr.split(/\s+/).filter(Boolean).length;
        return (currWordCount > prevWordCount || (currWordCount === prevWordCount && currTagStr.length > prevTagStr.length)) ? curr : prev;
    }, sameTypeTags[0]);

    const refTagStr = refTag.tag?.tag || '';
    const cleanRefTagStr = refTagStr.replace(/[!:;,.\-]+$/, '').trim();

    const refWords = new Set();
    const parenRegex = /\([^)]+\)/g;
    let remainingStr = refTagStr;
    let match;

    while ((match = parenRegex.exec(refTagStr)) !== null) {
        refWords.add(match[0]);
        remainingStr = remainingStr.replace(match[0], ' ');
    }
    remainingStr.split(/\s+/).filter(Boolean).forEach(word => {
        const cleanedWord = word.replace(/[:;,.\-!]+$/, '');
        if (cleanedWord) refWords.add(cleanedWord);
    });

    const refWordsArr = Array.from(refWords);
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedCleanRefTagStr = escapeRegex(cleanRefTagStr);

    const finalTags = sameTypeTags.map(item => {
        let modifiedStr = item.tag?.tag || '';
        if (!modifiedStr || item === refTag) return modifiedStr;

        if (cleanRefTagStr) {
            const patternFullRefParen = new RegExp(`\\(\\s*${escapedCleanRefTagStr}\\s*[:;,!.-]*\\s*\\)`, 'gi');
            modifiedStr = modifiedStr.replace(patternFullRefParen, '');
        }

        refWordsArr.forEach(word => {
            if (!word) return;
            const escapedWord = escapeRegex(word);

            if (word.startsWith('(') && word.endsWith(')')) {
                const patternParenExact = new RegExp(escapeRegex(word), 'gi');
                modifiedStr = modifiedStr.replace(patternParenExact, '');

                const wordNoParens = word.slice(1, -1);
                if (wordNoParens) {
                    const escapedWordNoParens = escapeRegex(wordNoParens);
                    const patternTargetParen = new RegExp(`\\(\\s*${escapedWordNoParens}\\s*\\)`, 'gi');
                    modifiedStr = modifiedStr.replace(patternTargetParen, '');
                    const patternWordNoParen = new RegExp(`(?:^|\\s)\\b${escapedWordNoParens}\\b(?:\\s|$)`, 'gi');
                    modifiedStr = modifiedStr.replace(patternWordNoParen, match => /\s/.test(match) ? ' ' : '');
                }
            } else {
                const patternTargetParen = new RegExp(`\\(\\s*${escapedWord}\\s*\\)`, 'gi');
                modifiedStr = modifiedStr.replace(patternTargetParen, '');
                const patternWord = new RegExp(`(?:^|\\s)\\b${escapedWord}\\b(?:\\s|$)`, 'gi');
                modifiedStr = modifiedStr.replace(patternWord, match => /\s/.test(match) ? ' ' : '');
            }
        });

        return modifiedStr.replace(/\s+/g, ' ').trim();
    });

    return finalTags.filter(part => part.length > 0).join(' • ');
};

const parseAPPosts = async (doc, config) => {
    const imgBlocks = doc.querySelectorAll('div.posts > div.central-block > span.img-block');
    const posts = Array.from(imgBlocks).map(block => {
        const linkElem = block.querySelector('a');
        const href = linkElem?.getAttribute('href') || '';
        const fullLink = href ? `https://anime-pictures.net${href}` : '';

        const idMatch = href.match(/\/posts\/(\d+)/);
        const id = idMatch?.[1] || Math.random().toString(36).substring(2);

        const imgElem = block.querySelector('picture img');
        const thumbSrc = imgElem?.getAttribute('src') || '';

        const fullImageUrl = thumbSrc?.replace('//opreviews.anime-pictures.net/', '//oimages.anime-pictures.net/')?.replace(/_([a-z]{2})\.(jpg|png|gif|webp|avif)$/i, '.$2') || '';

        const resElem = block.querySelector('.img-block-text a[href*="res_x"]');
        const resolution = resElem?.textContent.trim().replace(/(\d+)x(\d+)/i, '$1 × $2') || '';

        const title = ''; // Title is generated later from API

        return {
            id,
            title,
            res: resolution,
            url: fullImageUrl,
            link: fullLink,
            isNsfw: config.nsfw,
            source: 'anime-pictures',
        };
    });
    return posts;
};

const imageSources = {
    reddit: {
        id: 'reddit',
        name: 'Reddit',
        needsPagination: true,
        buildUrl: (config, after = null) => {
            const query = new URLSearchParams({
                sort: config.sort || 'top',
                t: config.t || 'year',
                show: 'all',
                restrict_sr: 1,
                include_over_18: config.nsfw || false,
                limit: 100,
            });
            if (config.q && config.q !== 'All') {
                query.set('q', `flair:"${config.q}"`);
            }
            if (after) {
                query.set('after', after);
            }
            const subr = config.nsfw ? 'AnimewallpaperNSFW' : 'Animewallpaper';
            const baseUrl = `https://www.reddit.com/r/${subr}`;
            const searchPath = config.q && config.q !== 'All' ? '/search.json' : '/.json';
            return `${baseUrl}${searchPath}?${query}`;
        },
        parseResponse: async (config, response) => {
            try {
                const json = await response.json();
                if (!json?.data?.children) return { posts: [], after: null };
                const posts = json.data.children
                    .map(e => e.data)
                    .filter(e => e.url?.includes('i.redd.it'))
                    .map(redditItem);
                return { posts, after: json.data.after };
            } catch (error) {
                console.error('Error parsing Reddit response:', error);
                return { posts: [], after: null };
            }
        },
        parseInfo: async (post) => {
            return {
                title: post.title,
                res: post.res || '',
                url: post.url,
                nsfw: post.isNsfw,
            };
        },
    },
    'anime-pictures': {
        id: 'anime-pictures',
        name: 'Anime Pictures',
        url: 'https://anime-pictures.net',
        needsPagination: true,
        buildUrl: (config, after = null) => {
            const pageNum = after === null ? 0 : after;
            const params = new URLSearchParams({
                page: pageNum,
                res_x: 1920,
                res_y: 1080,
                res_x_n: 1,
                res_y_n: 1,
                aspect: config.q === 'Desktop' ? '16:9' : config.q === 'Mobile' ? '9:16' : undefined,
                order_by: config.sort || 'rating',
                ldate: 0,
                lang: 'en',
            });

            params.set(config.nsfw ? 'search_tag' : 'denied_tags', 'light erotic');

            return `https://anime-pictures.net/posts?${params}`;
        },
        parseResponse: async (config, response, after = null) => {
            try {
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const posts = await parseAPPosts(doc, config);

                let totalPages = null;
                let nextPageNumber = null;

                const paginationElement = doc.querySelector('div.central-block form p, .paginator p');
                if (paginationElement) {
                    const pageMatch = paginationElement.textContent.match(/page of (\d+)/i);
                    totalPages = pageMatch?.[1] ? parseInt(pageMatch[1], 10) : null;
                }

                const currentPage = Number(after || 0);

                if (totalPages !== null && !isNaN(totalPages)) {
                    nextPageNumber = (currentPage + 1) < totalPages ? currentPage + 1 : null;
                } else {
                    const nextLink = doc.querySelector('.pagination a.next:not(.disabled), .paginator a[rel="next"]');
                    nextPageNumber = nextLink ? currentPage + 1 : null;
                }

                return {
                    posts,
                    after: nextPageNumber !== null ? String(nextPageNumber) : null,
                };
            } catch (error) {
                console.error('Error parsing anime-pictures response:', error);
                return { posts: [], after: null };
            }
        },
        parseInfo: async (post) => {
            try {
                const resp = await fetch(`https://api.anime-pictures.net/api/v3/posts/${post.id}`);
                if (!resp.ok) {
                    return { title: post.title, res: post.res || '', url: post.url, nsfw: post.nsfw };
                }
                const json = await resp.json();

                if (!json?.post) {
                    return { title: post.title, res: post.res || '', url: post.url, nsfw: post.nsfw };
                }
                const { post: data, tags } = json;
                const title = titleFromTags(tags);

                const res = `${data.width} × ${data.height}`;
                const preview = data.big_preview || undefined;
                const url = `https://oimages.anime-pictures.net/${data.md5.slice(0, 3)}/${data.md5}${data.ext}`;
                const nsfw = data.erotics > 0;

                return { title, res, url, preview, nsfw };

            } catch (error) {
                console.error('Error parsing anime-pictures info:', error);
                return { title: post.title, res: post.res || '', url: post.url, nsfw: post.nsfw };
            }
        },
    },
};

export default imageSources;