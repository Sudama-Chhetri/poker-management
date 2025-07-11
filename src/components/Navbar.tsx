import React from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-green-900 p-4 shadow-lg border-b border-green-800">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-3xl font-extrabold tracking-wider hover:text-yellow-400 transition duration-300 transform hover:scale-105 flex items-center space-x-3">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="#10B981" stroke="#FACC15" stroke-width="5"/>
            <rect x="25" y="15" width="50" height="70" rx="8" ry="8" fill="#FFFFFF" transform="rotate(-10 50 50)" stroke="#374151" stroke-width="2"/>
            <path d="M50 30 L60 55 L50 70 L40 55 Z" fill="#1F2937"/>
            <circle cx="50" cy="50" r="5" fill="#1F2937"/>
            <path d="M50 70 L45 75 L55 75 Z" fill="#1F2937"/>
          </svg>
          <span>Poker Tracker</span>
        </Link>
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
          <Link href="/" className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-base md:text-lg font-medium transition duration-200 shadow-md text-center">
            Dashboard
          </Link>
          <Link href="/overall-analytics" className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-base md:text-lg font-medium transition duration-200 shadow-md text-center">
            Overall Analytics
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
