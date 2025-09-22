import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Music, Users, TrendingUp, ArrowRight, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTracks } from '../hooks/useTracks';
import { TrackCard } from '../components/tracks/TrackCard';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export default function Home() {
  const { user } = useAuth();
  const { data: featuredTracks, isLoading } = useTracks({ featured: true, limit: 6 });
  const [stats, setStats] = useState({
    totalTracks: 0,
    totalUsers: 0,
    totalTrades: 0
  });

  useEffect(() => {
    // Fetch stats (you would implement this in your API)
    setStats({
      totalTracks: 1250,
      totalUsers: 340,
      totalTrades: 89
    });
  }, []);

  return (
    <>
      <Head>
        <title>DJ Thrift - Peer-to-Peer Track Trading</title>
        <meta name="description" content="Trade, buy, and sell DJ tracks in a decentralized marketplace built for the DJ community." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="relative py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                  Trade Tracks Like
                  <span className="gradient-text block">Vinyl Records</span>
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                  The first peer-to-peer marketplace where DJs can trade, buy, and sell tracks 
                  with built-in audio analysis, real-time trading, and community features.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/marketplace">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary text-lg px-8 py-4 flex items-center gap-2"
                    >
                      <Music className="w-5 h-5" />
                      Explore Marketplace
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  {!user && (
                    <Link href="/auth/register">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-outline text-lg px-8 py-4"
                      >
                        Join the Community
                      </motion.button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
              >
                <div className="glass-effect rounded-lg p-6">
                  <div className="text-4xl font-bold text-purple-400 mb-2">
                    {stats.totalTracks.toLocaleString()}
                  </div>
                  <div className="text-gray-300">Tracks Available</div>
                </div>
                <div className="glass-effect rounded-lg p-6">
                  <div className="text-4xl font-bold text-purple-400 mb-2">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                  <div className="text-gray-300">Active DJs</div>
                </div>
                <div className="glass-effect rounded-lg p-6">
                  <div className="text-4xl font-bold text-purple-400 mb-2">
                    {stats.totalTrades.toLocaleString()}
                  </div>
                  <div className="text-gray-300">Successful Trades</div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Built for DJs, by DJs
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Everything you need to discover, trade, and manage your track collection
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="card-dark p-6"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Smart Audio Analysis</h3>
                  <p className="text-gray-300">
                    Automatic BPM detection, key analysis, and waveform generation for every track
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="card-dark p-6"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Peer-to-Peer Trading</h3>
                  <p className="text-gray-300">
                    Trade tracks directly with other DJs using credits or cash
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="card-dark p-6"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Advanced Search</h3>
                  <p className="text-gray-300">
                    Find tracks by BPM, key, genre, and more with intelligent filtering
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Featured Tracks Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Featured Tracks
                </h2>
                <p className="text-xl text-gray-300">
                  Discover the latest tracks from our community
                </p>
              </motion.div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="card-dark p-4 animate-pulse">
                      <div className="w-full h-32 bg-gray-700 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredTracks?.map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    >
                      <TrackCard track={track} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center mt-12">
                <Link href="/marketplace">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn btn-primary text-lg px-8 py-4"
                  >
                    View All Tracks
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </motion.button>
                </Link>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Ready to Start Trading?
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Join thousands of DJs who are already trading tracks on our platform
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/register">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary text-lg px-8 py-4"
                    >
                      Get Started Free
                    </motion.button>
                  </Link>
                  <Link href="/marketplace">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-outline text-lg px-8 py-4"
                    >
                      Browse Tracks
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
