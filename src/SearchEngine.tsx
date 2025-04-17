import React, { useState, useEffect } from 'react';
import './SearchEngine.css';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

const SearchEngine: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replace with your actual API key and search engine ID if using Google Custom Search
  const API_KEY = "AIzaSyAxycCQM3_Fx6JQDtfkXtcA9z9H3zuQZCE";
  const SEARCH_ENGINE_ID = 'fa00e9b032795da9a';

  
  

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // For demo purposes, we'll use a mock API
      // For real implementation, use Google Custom Search API or another search API
    //   const mockResults: SearchResult[] = [
    //     {
    //       title: `Results for "${query}" - Example Result 1`,
    //       link: 'https://example.com/1',
    //       snippet: `This is a sample search result for ${query}. The search engine would return relevant information here.`
    //     },
    //     {
    //       title: `Results for "${query}" - Example Result 2`,
    //       link: 'https://example.com/2',
    //       snippet: `Another example result showing how ${query} might appear in search results.`
    //     },
    //     {
    //       title: `Results for "${query}" - Technical Details`,
    //       link: 'https://example.com/3',
    //       snippet: `Technical information about ${query} would appear in this section of the search result.`
    //     }
    //   ];

      // Simulate API delay
    //   await new Promise(resolve => setTimeout(resolve, 500));
    //   setResults(mockResults);

      // For actual Google Custom Search API implementation:
      
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${API_KEY}&cx=${SEARCH_ENGINE_ID}`
      );
      const data = await response.json();
      setResults(data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      })));
      
    } catch (err) {
      setError('Failed to fetch search results');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="search-engine">
      <div className="search-header">
        <h1>My Search Engine</h1>
        <form onSubmit={search}>
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the web..."
              autoFocus
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="search-results">
        {isLoading ? (
          <div className="loading">Loading results...</div>
        ) : (
          results.map((result, index) => (
            <div key={index} className="result">
              <h3>
                <a href={result.link} target="_blank" rel="noopener noreferrer">
                  {result.title}
                </a>
              </h3>
              <p className="link">{result.link}</p>
              <p className="snippet">{result.snippet}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchEngine;