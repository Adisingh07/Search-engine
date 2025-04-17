import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SearchEngine.css';

type SearchType = 'web' | 'image' | 'video' | 'news';

interface SearchResult {
  id: string;
  title: string;
  link: string;
  snippet?: string;
  image?: string;
  publishedAt?: string;
  source?: string;
  duration?: string;
  viewCount?: string;
}

interface ApiResponse {
  results: SearchResult[];
  total: number;
  error?: string;
}

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchType, setSearchType] = useState<SearchType>('web');
  const [darkMode, setDarkMode] = useState(false);
  const resultsPerPage = 20;

  // API Keys (in production, use environment variables)
  const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.REACT_APP_SEARCH_ENGINE_ID;
  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
  const NEWS_API_KEY = process.env.REACT_APP_NEWS_API_KEY;
   // Replace with your key

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const type = (searchParams.get('type') || 'web') as SearchType;
    
    setQuery(searchQuery);
    setCurrentPage(page);
    setSearchType(type);

    if (searchQuery) {
      performSearch(searchQuery, page, type);
    }
  }, [location.search]);

  const performSearch = async (searchQuery: string, page: number = 1, type: SearchType = 'web') => {
    setIsLoading(true);
    setError(null);

    try {
      let response: ApiResponse;

      switch(type) {
        case 'image':
          response = await performGoogleImageSearch(searchQuery, page);
          break;
        case 'video':
          response = await performYouTubeSearch(searchQuery, page);
          break;
        case 'news':
          response = await performNewsSearch(searchQuery, page);
          break;
        default:
          response = await performWebSearch(searchQuery, page);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      setResults(response.results);
      setTotalResults(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch search results');
      console.error(err);
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const performWebSearch = async (query: string, page: number): Promise<ApiResponse> => {
    try {
      const startIndex = (page - 1) * resultsPerPage + 1;
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&start=${startIndex}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        results: data.items?.map((item: any) => ({
          id: item.cacheId || item.link,
          title: item.title,
          link: item.link,
          snippet: item.snippet
        })) || [],
        total: parseInt(data.searchInformation?.totalResults) || 0
      };
    } catch (error) {
      return {
        results: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Web search failed'
      };
    }
  };

  const performGoogleImageSearch = async (query: string, page: number): Promise<ApiResponse> => {
    try {
      const startIndex = (page - 1) * resultsPerPage + 1;
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&searchType=image&start=${startIndex}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Image API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        results: data.items?.map((item: any) => ({
          id: item.image.contextLink,
          title: item.title,
          link: item.image.contextLink,
          image: item.link
        })) || [],
        total: parseInt(data.searchInformation?.totalResults) || 0
      };
    } catch (error) {
      return {
        results: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Image search failed'
      };
    }
  };

  const performYouTubeSearch = async (query: string, page: number): Promise<ApiResponse> => {
    try {
      // YouTube uses page tokens instead of page numbers
      let pageToken = '';
      if (page > 1) {
        // In a real app, you'd need to track page tokens
        return {
          results: [],
          total: 0,
          error: 'Pagination beyond page 1 not implemented for YouTube'
        };
      }

      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${resultsPerPage}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&type=video${pageToken ? `&pageToken=${pageToken}` : ''}`
      );
      
      if (!searchResponse.ok) {
        throw new Error(`YouTube Search API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      // Get video details in parallel
      const videoDetails = await Promise.all(
        searchData.items.map(async (item: any) => {
          try {
            const detailsResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${item.id.videoId}&key=${YOUTUBE_API_KEY}`
            );
            
            if (!detailsResponse.ok) {
              console.error(`Failed to get details for video ${item.id.videoId}`);
              return {
                item,
                details: null
              };
            }
            
            const detailsData = await detailsResponse.json();
            return {
              item,
              details: detailsData.items[0]
            };
          } catch (error) {
            console.error(`Error fetching video details: ${error}`);
            return {
              item,
              details: null
            };
          }
        })
      );

      return {
        results: videoDetails.map(({item, details}) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          image: item.snippet.thumbnails?.medium?.url || '',
          publishedAt: item.snippet.publishedAt,
          duration: details?.contentDetails?.duration,
          viewCount: details?.statistics?.viewCount
        })),
        total: searchData.pageInfo?.totalResults || 0
      };
    } catch (error) {
      return {
        results: [],
        total: 0,
        error: error instanceof Error ? error.message : 'YouTube search failed'
      };
    }
  };

  const performNewsSearch = async (query: string, page: number): Promise<ApiResponse> => {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${NEWS_API_KEY}&pageSize=${resultsPerPage}&page=${page}`
      );
      
      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message || 'News API returned an error');
      }
      
      return {
        results: data.articles?.map((article: any) => ({
          id: article.url,
          title: article.title,
          link: article.url,
          snippet: article.description,
          image: article.urlToImage,
          publishedAt: article.publishedAt,
          source: article.source?.name
        })) || [],
        total: data.totalResults || 0
      };
    } catch (error) {
      return {
        results: [],
        total: 0,
        error: error instanceof Error ? error.message : 'News search failed'
      };
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  const handleNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }
    navigate(`/results?q=${encodeURIComponent(query)}&page=1&type=${searchType}`);
  };

  const handlePageChange = (newPage: number) => {
    navigate(`/results?q=${encodeURIComponent(query)}&page=${newPage}&type=${searchType}`);
  };

  const handleTabChange = (type: SearchType) => {
    navigate(`/results?q=${encodeURIComponent(query)}&page=1&type=${type}`);
  };

  const formatDuration = (duration: string = ''): string => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    
    const hours = match[1] ? `${match[1]}:` : '';
    const minutes = match[2] || '0';
    const seconds = match[3] ? match[3].padStart(2, '0') : '00';
    
    return `${hours}${minutes}:${seconds}`;
  };

  const formatViews = (views: string = '0'): string => {
    const num = parseInt(views);
    if (isNaN(num)) return '0';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string = ''): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const totalPages = Math.ceil(totalResults / resultsPerPage);

  return (
    <div className={`results-page ${darkMode ? 'dark-mode' : ''}`}>
      <div className="search-header">
        <div className="header-top">
          <h1 onClick={() => navigate('/')}>Aditya Goo</h1>
          <button 
            className="dark-mode-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        <form onSubmit={handleNewSearch}>
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the web..."
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        <div className="search-tabs">
          <button
            className={`tab ${searchType === 'web' ? 'active' : ''}`}
            onClick={() => handleTabChange('web')}
            disabled={isLoading}
          >
            Web
          </button>
          <button
            className={`tab ${searchType === 'image' ? 'active' : ''}`}
            onClick={() => handleTabChange('image')}
            disabled={isLoading}
          >
            Images
          </button>
          <button
            className={`tab ${searchType === 'video' ? 'active' : ''}`}
            onClick={() => handleTabChange('video')}
            disabled={isLoading}
          >
            Videos
          </button>
          <button
            className={`tab ${searchType === 'news' ? 'active' : ''}`}
            onClick={() => handleTabChange('news')}
            disabled={isLoading}
          >
            News
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => performSearch(query, currentPage, searchType)} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <div className="search-results">
        {isLoading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            Loading {searchType} results...
          </div>
        ) : (
          <>
            {results.length > 0 && (
              <div className="results-count">
                About {totalResults} {searchType} results (Page {currentPage} of {totalPages})
              </div>
            )}
            
            {searchType === 'image' ? (
              <div className="image-results">
                {results.map((result) => (
                  <div key={result.id} className="image-result">
                    <a href={result.link} target="_blank" rel="noopener noreferrer">
                      <img src={result.image} alt={result.title} onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }} />
                      <p>{result.title}</p>
                    </a>
                  </div>
                ))}
              </div>
            ) : searchType === 'video' ? (
              <div className="video-results">
                {results.map((result) => (
                  <div key={result.id} className="video-result">
                    <a href={result.link} target="_blank" rel="noopener noreferrer">
                      <div className="video-thumbnail">
                        <img src={result.image} alt={result.title} />
                        {result.duration && (
                          <span className="video-duration">{formatDuration(result.duration)}</span>
                        )}
                      </div>
                      <div className="video-info">
                        <h3>{result.title}</h3>
                        <div className="video-meta">
                          {result.viewCount && <span>{formatViews(result.viewCount)} views</span>}
                          {result.publishedAt && <span>{formatDate(result.publishedAt)}</span>}
                        </div>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            ) : searchType === 'news' ? (
              <div className="news-results">
                {results.map((result) => (
                  <div key={result.id} className="news-result">
                    <a href={result.link} target="_blank" rel="noopener noreferrer">
                      {result.image && (
                        <div className="news-image">
                          <img src={result.image} alt={result.title} />
                        </div>
                      )}
                      <div className="news-content">
                        {result.source && <div className="news-source">{result.source}</div>}
                        <h3>{result.title}</h3>
                        {result.snippet && <p>{result.snippet}</p>}
                        {result.publishedAt && <div className="news-date">{formatDate(result.publishedAt)}</div>}
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              results.map((result) => (
                <div key={result.id} className="result">
                  <h3>
                    <a href={result.link} target="_blank" rel="noopener noreferrer">
                      {result.title}
                    </a>
                  </h3>
                  <p className="link">{result.link}</p>
                  {result.snippet && <p className="snippet">{result.snippet}</p>}
                </div>
              ))
            )}

            {totalPages > 1 && results.length > 0 && (
              <div className="pagination">
                {currentPage > 1 && (
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="pagination-button"
                    disabled={isLoading}
                  >
                    Previous
                  </button>
                )}
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                      disabled={isLoading || currentPage === pageNum}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {currentPage < totalPages && (
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="pagination-button"
                    disabled={isLoading}
                  >
                    Next
                  </button>
                )}
              </div>
            )}

            {!isLoading && results.length === 0 && !error && (
              <div className="no-results">
                No results found for "{query}"
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;