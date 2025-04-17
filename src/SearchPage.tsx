import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchEngine.css';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/results?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="search-page">
      <div className="search-container">
        <h1>Aditya Goo</h1>
        <form onSubmit={handleSearch}>
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the web..."
              autoFocus
            />
            <button type="submit">Search</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchPage;