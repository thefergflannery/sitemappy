import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import xml2js from 'xml2js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const depth = parseInt(searchParams.get('depth') || '1');
  const excludeBlog = searchParams.get('excludeBlog') === 'true';

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const visited = new Set<string>();
    const posts: string[] = [];
    const pages: string[] = [];
    const brokenLinks: string[] = [];
    let total = 0;
    const baseUrl = url; // Store the base URL as a string

    // Function to check if URL is a main navigation page
    function isMainPageUrl(url: string): boolean {
      const lowerUrl = url.toLowerCase();
      // Skip common non-page patterns
      return !(
        lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|pdf|doc|docx|xls|xlsx|zip|rar|mp3|mp4|webm|ogg|woff|woff2|ttf|eot)$/) ||
        lowerUrl.includes('/wp-content/') ||
        lowerUrl.includes('/wp-includes/') ||
        lowerUrl.includes('/wp-json/') ||
        lowerUrl.includes('/wp-admin/') ||
        lowerUrl.includes('/feed/') ||
        lowerUrl.includes('/rss/') ||
        lowerUrl.includes('/atom/') ||
        lowerUrl.includes('/sitemap') ||
        lowerUrl.includes('/robots.txt') ||
        lowerUrl.includes('/favicon.ico') ||
        lowerUrl.includes('/manifest.json') ||
        lowerUrl.includes('/sw.js') ||
        lowerUrl.includes('/service-worker.js') ||
        lowerUrl.includes('/_next/') ||
        lowerUrl.includes('/static/') ||
        lowerUrl.includes('/assets/') ||
        lowerUrl.includes('/media/') ||
        lowerUrl.includes('/uploads/') ||
        lowerUrl.includes('/images/') ||
        lowerUrl.includes('/img/') ||
        lowerUrl.includes('/css/') ||
        lowerUrl.includes('/js/') ||
        lowerUrl.includes('/fonts/') ||
        lowerUrl.includes('/vendor/') ||
        lowerUrl.includes('/node_modules/') ||
        lowerUrl.includes('/api/') ||
        lowerUrl.includes('/graphql') ||
        lowerUrl.includes('/admin/') ||
        lowerUrl.includes('/login') ||
        lowerUrl.includes('/signup') ||
        lowerUrl.includes('/register') ||
        lowerUrl.includes('/account') ||
        lowerUrl.includes('/cart') ||
        lowerUrl.includes('/checkout')
      );
    }

    // Check for sitemap.xml first
    let sitemapUrl: string | undefined = undefined;
    let sitemapPages: string[] = [];
    try {
      const sitemapResponse = await axios.get(new URL('/sitemap.xml', url).toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SiteMappyBot/1.0; +http://sitemappy.com)',
        },
        timeout: 10000,
      });
      sitemapUrl = new URL('/sitemap.xml', url).toString();
      // Parse sitemap.xml
      const parsed = await xml2js.parseStringPromise(sitemapResponse.data);
      if (parsed.urlset && parsed.urlset.url) {
        sitemapPages = parsed.urlset.url.map((entry: any) => entry.loc[0]);
      }
    } catch (error) {
      // No sitemap.xml found or failed to parse
    }

    if (sitemapPages.length > 0) {
      // Use sitemap URLs as pages, filter out /blog if needed
      const filteredPages = excludeBlog ? sitemapPages.filter(u => !u.includes('/blog')) : sitemapPages;
      return NextResponse.json({
        total: filteredPages.length,
        posts: [],
        pages: filteredPages,
        brokenLinks: [],
        sitemapUrl,
      }, { headers });
    }

    async function crawl(currentUrl: string, currentDepth: number) {
      if (visited.has(currentUrl) || currentDepth < 0) return;
      if (excludeBlog && currentUrl.includes('/blog')) return;
      
      // Add to visited set before processing to prevent duplicate processing
      visited.add(currentUrl);

      try {
        const response = await axios.get(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SiteMappyBot/1.0; +http://sitemappy.com)',
          },
          timeout: 10000, // 10 second timeout
        });
        const $ = cheerio.load(response.data);
        total++;

        // Check if it's a post or page
        const isPost = $('article').length > 0 || 
                      currentUrl.includes('/blog/') || 
                      currentUrl.includes('/post/') ||
                      currentUrl.includes('/news/');
        
        if (isPost) {
          posts.push(currentUrl);
        } else {
          pages.push(currentUrl);
        }

        // Only crawl links if we are at the starting URL (currentDepth === depth)
        if (currentDepth === depth && depth > 0) {
          const mainNavLinks = $('nav a, header a, .menu a, .navigation a, .main-menu a')
            .map((_, el) => {
              const href = $(el).attr('href');
              return href || '';
            })
            .get()
            .filter(href => 
              href !== '' && 
              !href.startsWith('#') && 
              !href.startsWith('mailto:') && 
              !href.startsWith('tel:')
            );

          for (const link of mainNavLinks) {
            try {
              const absoluteUrl = new URL(link, currentUrl).toString();
              if (absoluteUrl.startsWith(baseUrl) && 
                  !visited.has(absoluteUrl) && 
                  isMainPageUrl(absoluteUrl)) {
                // Only crawl one level deep
                await crawl(absoluteUrl, currentDepth - 1);
              }
            } catch (error) {
              brokenLinks.push(link);
            }
          }
        }
      } catch (error) {
        console.error(`Error crawling ${currentUrl}:`, error);
        brokenLinks.push(currentUrl);
      }
    }

    // Start crawling with the specified depth
    await crawl(url, depth);

    return NextResponse.json({
      total,
      posts,
      pages,
      brokenLinks,
      sitemapUrl,
    }, { headers });
  } catch (error) {
    console.error('Error crawling website:', error);
    return NextResponse.json(
      { error: 'Failed to crawl website. Please check the URL and try again.' },
      { status: 500, headers }
    );
  }
} 