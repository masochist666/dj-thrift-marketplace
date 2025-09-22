import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Menu, X, User, LogOut, Settings, Music, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Music className="w-8 h-8 text-primary-400" />
            <span className="text-xl font-bold text-white">DJ Thrift</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/marketplace" className="text-white hover:text-primary-400 transition-colors">
              Marketplace
            </Link>
            <Link href="/groups" className="text-white hover:text-primary-400 transition-colors">
              Groups
            </Link>
            <Link href="/trades" className="text-white hover:text-primary-400 transition-colors">
              Trades
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/upload" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Upload Track
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-white hover:text-primary-400 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>{user.username}</span>
                  </button>
                  
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
                    >
                      <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        Dashboard
                      </Link>
                      <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        Profile
                      </Link>
                      <Link href="/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/login" className="text-white hover:text-primary-400 transition-colors">
                  Login
                </Link>
                <Link href="/auth/register" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-primary-400 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/20 py-4"
          >
            <nav className="flex flex-col space-y-4">
              <Link href="/marketplace" className="text-white hover:text-primary-400 transition-colors">
                Marketplace
              </Link>
              <Link href="/groups" className="text-white hover:text-primary-400 transition-colors">
                Groups
              </Link>
              <Link href="/trades" className="text-white hover:text-primary-400 transition-colors">
                Trades
              </Link>
              {user ? (
                <>
                  <Link href="/upload" className="text-white hover:text-primary-400 transition-colors">
                    Upload Track
                  </Link>
                  <Link href="/dashboard" className="text-white hover:text-primary-400 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/profile" className="text-white hover:text-primary-400 transition-colors">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-left text-white hover:text-primary-400 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-white hover:text-primary-400 transition-colors">
                    Login
                  </Link>
                  <Link href="/auth/register" className="text-white hover:text-primary-400 transition-colors">
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
}