'use client';

import React, { useState, useEffect } from "react";
import { PlayerDashboard } from "@/components/PlayerDashboard";
import Link from "next/link";

export default function Home() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const response = await fetch("/api/players");
      const data = await response.json();
      setPlayers(data);
    };
    fetchPlayers();
  }, []);

  return (
    <div className="bg-gray-950 text-white min-h-screen p-8 font-sans">
      {/* Thematic Header */}
      <header className="text-center mb-12 bg-gray-950 p-6 rounded-lg shadow-lg border border-gray-800">
        <div className="flex items-center justify-center space-x-4 mb-4">
          {/* Poker Chip Icon */}
          <span className="text-4xl md:text-5xl text-yellow-400" role="img" aria-label="poker chip">♠️</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-400 tracking-wide">Poker Tracker</h1>
          {/* Card Icon */}
          <span className="text-4xl md:text-5xl text-yellow-400" role="img" aria-label="playing cards">♦️</span>
        </div>
        <p className="text-lg md:text-xl text-gray-400">Manage your game, master your stats.</p>
      </header>

      {/* Poker Table Section (Simplified for visual appeal) */}
      <div className="bg-green-900 rounded-full w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-4xl mx-auto p-8 sm:p-10 md:p-12 mb-12 shadow-2xl flex justify-center items-center relative border-4 border-yellow-600" style={{ aspectRatio: '2 / 1' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex space-x-4 sm:space-x-6">
          {/* Stylized Card Placeholders */}
          <div className="w-16 h-24 sm:w-20 sm:h-28 bg-red-800 rounded-lg shadow-lg flex items-center justify-center text-2xl sm:text-3xl font-bold text-white border-2 border-gray-300 transform rotate-[-10deg]">A</div>
          <div className="w-16 h-24 sm:w-20 sm:h-28 bg-gray-800 rounded-lg shadow-lg flex items-center justify-center text-2xl sm:text-3xl font-bold text-white border-2 border-gray-300 transform rotate-[10deg]">K</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
        <PlayerDashboard players={players} setPlayers={setPlayers} />
      </div>
    </div>
  );
}