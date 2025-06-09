'use client';
import { useState } from 'react';

export default function SitemapGenerator() {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/generate?url=${encodeURIComponent(url)}&depth=${depth}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate sitemap');
      }
      
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Website Sitemap Generator</h1>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="input-group">
          <label htmlFor="url">Website URL:</label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="depth">Crawl Depth:</label>
          <select
            id="depth"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
          >
            <option value={1}>1 - Surface Level</option>
            <option value={2}>2 - One Level Deep</option>
            <option value={3}>3 - Comprehensive</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Sitemap'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results && (
        <div className="results">
          <h2>Results for {results.baseUrl}</h2>
          <p>Crawled at: {new Date(results.crawledAt).toLocaleString()}</p>
          <p>Total Pages Found: {results.pageCount}</p>
          
          <div className="sitemap-list">
            {results.pages.map((page, index) => (
              <div key={index} className="page-item">
                <a href={page.url} target="_blank" rel="noopener noreferrer">
                  {page.url}
                </a>
                <span className="depth">(Depth: {page.depth})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}