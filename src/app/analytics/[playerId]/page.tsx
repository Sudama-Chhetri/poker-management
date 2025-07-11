'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnalyticsComponent from '@/components/Analytics';

interface Player {
  id: number;
  name: string;
}

const AnalyticsPage: React.FC = () => {
  const { playerId } = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSessionChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (playerId) {
        const playersResponse = await fetch('/api/players');
        const playersData: Player[] = await playersResponse.json();
        const foundPlayer = playersData.find(p => p.id === parseInt(playerId as string));
        if (foundPlayer) {
          setPlayer(foundPlayer);
        } else {
          router.push('/'); // Redirect if player not found
        }
      }
    };
    fetchData();
  }, [playerId, router, refreshKey]); // Add refreshKey to dependencies

  if (!player) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-800 text-white">Loading analytics...</div>;
  }

  return (
    <div className="bg-gray-800 text-white min-h-screen p-8">
      <button
        onClick={() => router.push('/')}
        className="mb-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition duration-200 ease-in-out"
      >
        &larr; Back to Dashboard
      </button>
      <AnalyticsComponent player={player} onSessionChange={handleSessionChange} refreshKey={refreshKey} />
    </div>
  );
};

export default AnalyticsPage;
