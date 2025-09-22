import React, { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Search, Filter, Grid, List, SlidersHorizontal } from 'lucide-react';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { TrackCard } from '../../components/tracks/TrackCard';
import { useTracks } from '../../hooks/useTracks';

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    genre: '',
    bpm_min: '',
    bpm_max: '',
    key: '',
    price_min: '',
    price_max: '',
    sort: 'newest'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const { data: tracksData, isLoading, error } = useTracks({
    search: searchQuery,
    ...filters,
    limit: 24
  });

  const tracks = tracksData?.results || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the useTracks hook with the searchQuery state
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      genre: '',
      bpm_min: '',
      bpm_max: '',
      key: '',
      price_min: '',
      price_max: '',
      sort: 'newest'
    });
    setSearchQuery('');
  };

  return (
    <>
      <Head>
        <title>Marketplace - DJ Thrift</title>
        <meta name="description" content="Browse and discover DJ tracks in our marketplace" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Marketplace</h1>
            <p className="text-gray-400">Discover and trade tracks from DJs around the world</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tracks, artists, genres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                  <select
                    value={filters.genre}
                    onChange={(e) => handleFilterChange('genre', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Genres</option>
                    <option value="house">House</option>
                    <option value="techno">Techno</option>
                    <option value="trance">Trance</option>
                    <option value="dubstep">Dubstep</option>
                    <option value="drum-and-bass">Drum & Bass</option>
                    <option value="progressive">Progressive</option>
                    <option value="deep-house">Deep House</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">BPM Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.bpm_min}
                      onChange={(e) => handleFilterChange('bpm_min', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.bpm_max}
                      onChange={(e) => handleFilterChange('bpm_max', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Key</label>
                  <select
                    value={filters.key}
                    onChange={(e) => handleFilterChange('key', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Any Key</option>
                    <option value="C">C</option>
                    <option value="C#">C#</option>
                    <option value="D">D</option>
                    <option value="D#">D#</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                    <option value="F#">F#</option>
                    <option value="G">G</option>
                    <option value="G#">G#</option>
                    <option value="A">A</option>
                    <option value="A#">A#</option>
                    <option value="B">B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min $"
                      value={filters.price_min}
                      onChange={(e) => handleFilterChange('price_min', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="number"
                      placeholder="Max $"
                      value={filters.price_max}
                      onChange={(e) => handleFilterChange('price_max', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Filter Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={clearFilters}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
              <div className="text-sm text-gray-400">
                {tracks.length} tracks found
              </div>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card-dark p-4 animate-pulse">
                  <div className="w-full h-32 bg-gray-700 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">Failed to load tracks</p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No tracks found</p>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {tracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <TrackCard track={track} />
                </motion.div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}

