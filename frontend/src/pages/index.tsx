import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Music, Users, Zap, Shield, ArrowRight, Play } from 'lucide-react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);

  const features = [
    {
      icon: <Music className="w-8 h-8" />,
      title: 'Track Trading',
      description: 'Trade your DJ tracks with other artists using our secure peer-to-peer system.'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Community',
      description: 'Join groups, follow artists, and build your network in the DJ community.'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Real-time',
      description: 'Get instant notifications, live chat, and real-time trading updates.'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Secure',
      description: 'Your tracks are protected with industry-standard security and encryption.'
    }
  ];

  return (
    <>
      <Head>
        <title>DJ Thrift Marketplace - Peer-to-Peer DJ Track Trading</title>
        <meta name="description" content="Trade, buy, and sell DJ tracks with built-in audio analysis, real-time trading, and community features." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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
                  🎶 DJ Thrift Marketplace
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                  Trade, buy, and sell DJ tracks with built-in audio analysis, real-time trading, and community features.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/marketplace">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Start Trading
                    </motion.button>
                  </Link>
                  <Link href="/auth/register">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 flex items-center gap-2"
                    >
                      Join Community
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Why Choose DJ Thrift?
                </h2>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                  Built for DJs, by DJs. Experience the future of track trading with cutting-edge technology.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center hover:bg-white/20 transition-colors duration-200"
                  >
                    <div className="text-primary-400 mb-4 flex justify-center">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
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
                  Join thousands of DJs already trading tracks on our platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/register">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200"
                    >
                      Get Started Free
                    </motion.button>
                  </Link>
                  <Link href="/marketplace">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-transparent border-2 border-primary-600 text-primary-400 hover:bg-primary-600 hover:text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200"
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