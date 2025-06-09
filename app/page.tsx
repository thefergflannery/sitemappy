'use client';

import { useState, useEffect } from 'react';
import { APP_VERSION } from './version';

interface SitemapResults {
  total: number;
  posts: string[];
  pages: string[];
  brokenLinks: string[];
  sitemapUrl?: string;
  scanProgress?: {
    current: number;
    total: number;
    status: 'scanning' | 'processing' | 'complete';
  };
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [results, setResults] = useState<SitemapResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    status: 'scanning' | 'processing' | 'complete';
    currentUrl?: string;
  }>({
    current: 0,
    total: 0,
    status: 'complete',
    currentUrl: undefined
  });
  const itemsPerPage = 50;
  const [excludeBlog, setExcludeBlog] = useState(false);

  useEffect(() => {
    if (!loading) return;
  
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/generate?url=${encodeURIComponent(url)}&depth=${depth}&excludeBlog=${excludeBlog}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          setLoading(false);
        } else {
          setResults(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to analyze website. Please check the URL and try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [loading, url, depth, excludeBlog]);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^https?:\/\//i.test(url)) {
      setError('URL must start with http:// or https://');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
  };

  const paginatedPosts = results?.posts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  const paginatedPages = results?.pages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  const exportCSV = () => {
    const csvContent = [
      ['URL', 'Type'],
      ...results!.posts.map(url => [url, 'Post']),
      ...results!.pages.map(url => [url, 'Page']),
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.csv';
    a.click();
  };

  const exportXML = () => {
    const xmlContent = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${[...results!.posts, ...results!.pages].map(url => `
          <url>
            <loc>${url}</loc>
          </url>
        `).join('')}
      </urlset>
    `;
    
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
  };

  const exportJSON = () => {
    const jsonContent = JSON.stringify({
      posts: results!.posts,
      pages: results!.pages,
      brokenLinks: results!.brokenLinks
    }, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.json';
    a.click();
  };

  return (
    <div className="container">
      <header className="header">
        <span className="app-version">v{APP_VERSION}</span>
        <h1 className="title">SiteMappy</h1>
        <p className="subtitle">Advanced Website Structure Analysis Tool</p>
        <button 
          className="dark-mode-toggle"
          onClick={() => setDarkMode(!darkMode)}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="url"
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            aria-label="Website URL"
          />
          <select 
            className="input"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            aria-label="Crawl depth"
          >
            <option value={1}>Depth: 1 (Shallow)</option>
            <option value={2}>Depth: 2 (Medium)</option>
            <option value={3}>Depth: 3 (Deep)</option>
            <option value={0}>Depth: All Levels</option>
          </select>
        </div>
        <div style={{marginBottom: '1rem'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <input
              type="checkbox"
              checked={excludeBlog}
              onChange={e => setExcludeBlog(e.target.checked)}
            />
            Exclude /blog directories
          </label>
        </div>
        <button 
          type="submit" 
          className="button"
          disabled={loading}
          aria-label={loading ? 'Analyzing website...' : 'Start analysis'}
        >
          {loading ? (
            <div className="button-content">
              <span className="loader"></span>
              <span>
                {scanProgress.status === 'scanning' ? 'Scanning...' : 
                 scanProgress.status === 'processing' ? 'Processing...' : 
                 'Analyzing...'}
              </span>
            </div>
          ) : 'Map It'}
        </button>
      </form>

      {loading && (
        <div className="progress-container">
          <div className="progress-header">
            <h3>Analyzing Website</h3>
            <span className="progress-status">{scanProgress.status}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress"
              style={{ 
                width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` 
              }}
            ></div>
          </div>
          <div className="progress-stats">
            <span>{scanProgress.current} of {scanProgress.total} URLs scanned</span>
            {scanProgress.currentUrl && (
              <span className="current-url">Currently scanning: {scanProgress.currentUrl}</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="error-card" role="alert">
          <div className="error-header">
            <svg className="alert-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h3>Analysis Error</h3>
          </div>
          <p>{error}</p>
          <button 
            className="button secondary"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {results && (
        <div className="results-container">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total URLs</h3>
              <p>{results.total}</p>
            </div>
            <div className="stat-card">
              <h3>Broken Links</h3>
              <p>{results.brokenLinks.length}</p>
            </div>
            {results.sitemapUrl && (
              <div className="stat-card">
                <h3>Sitemap Found</h3>
                <a 
                  href={results.sitemapUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="sitemap-link"
                >
                  View sitemap.xml
                </a>
              </div>
            )}
          </div>

          <div className="export-buttons">
            <button onClick={exportCSV} className="button secondary" aria-label="Export as CSV">
              <span className="button-icon">📊</span>
              Export CSV
            </button>
            <button onClick={exportXML} className="button secondary" aria-label="Export as XML">
              <span className="button-icon">📄</span>
              Export XML
            </button>
            <button onClick={exportJSON} className="button secondary" aria-label="Export as JSON">
              <span className="button-icon">📋</span>
              Export JSON
            </button>
          </div>

          <div className="accordion">
            <details open>
              <summary>
                <span className="summary-content">
                  <span className="summary-title">Core Pages</span>
                  <span className="summary-count">({results.pages.length})</span>
                </span>
              </summary>
              <div className="url-list">
                {paginatedPages.map((url, i) => (
                  <a 
                    key={i} 
                    href={url} 
                    className="url-item"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {url}
                  </a>
                ))}
              </div>
            </details>

            <details>
              <summary>
                <span className="summary-content">
                  <span className="summary-title">Dynamic Content</span>
                  <span className="summary-count">({results.posts.length})</span>
                </span>
              </summary>
              <div className="url-list">
                {paginatedPosts.map((url, i) => (
                  <a 
                    key={i} 
                    href={url} 
                    className="url-item"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {url}
                  </a>
                ))}
              </div>
            </details>

            {results.brokenLinks.length > 0 && (
              <details>
                <summary>
                  <span className="summary-content">
                    <span className="summary-title">Broken Links</span>
                    <span className="summary-count error">({results.brokenLinks.length})</span>
                  </span>
                </summary>
                <div className="url-list">
                  {results.brokenLinks.map((url, i) => (
                    <div key={i} className="url-item error">
                      {url}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div className="pagination">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
              aria-label="Previous page"
            >
              ← Previous
            </button>
            <span className="pagination-info">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={(results.posts.length + results.pages.length) <= currentPage * itemsPerPage}
              className="pagination-button"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}