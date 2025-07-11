import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const formatDateToDDMMYYYY = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

interface Player {
  id: number;
  name: string;
}

interface Session {
  id: number;
  playerId: number;
  buyIn: number;
  cashOut: number;
  gameType: string;
  sessionDate: string;
}

interface PlayerDashboardProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ players, setPlayers }) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerStats, setPlayerStats] = useState<{ [key: number]: { totalBuyIn: number; totalCashOut: number; netProfit: number; winRate: number; } }>({});
  const [playerSessions, setPlayerSessions] = useState<{ [key: number]: Session[] }>({});
  const router = useRouter();

  // Fetch overall player stats
  useEffect(() => {
    const fetchPlayerStats = async () => {
      const stats: { [key: number]: { totalBuyIn: number; totalCashOut: number; netProfit: number; winRate: number; } } = {};
      const allSessions: { [key: number]: Session[] } = {};

      for (const player of players) {
        const response = await fetch(`/api/sessions?playerId=${player.id}`);
        const sessions: Session[] = await response.json();
        allSessions[player.id] = sessions;

        let totalBuyIn = 0;
        let totalCashOut = 0;
        let wins = 0;
        sessions.forEach(session => {
          totalBuyIn += session.buyIn;
          totalCashOut += session.cashOut;
          if (session.cashOut - session.buyIn > 0) {
            wins++;
          }
        });
        const netProfit = totalCashOut - totalBuyIn;
        const winRate = sessions.length > 0 ? (wins / sessions.length) * 100 : 0;

        stats[player.id] = { totalBuyIn, totalCashOut, netProfit, winRate };
      }
      setPlayerStats(stats);
      setPlayerSessions(allSessions);
    };

    if (players.length > 0) {
      fetchPlayerStats();
    }
  }, [players]);

  const handleAddPlayer = async () => {
    if (newPlayerName.trim() === '') return;
    const response = await fetch('/api/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newPlayerName }),
    });
    const newPlayer: Player = await response.json();
    setPlayers([newPlayer, ...players]);
    setNewPlayerName('');
  };

  const handleDeletePlayer = async (playerId: number) => {
    if (window.confirm('Are you sure you want to delete this player and all their sessions?')) {
      await fetch(`/api/players?id=${playerId}`, {
        method: 'DELETE',
      });
      setPlayers(players.filter(player => player.id !== playerId));
    }
  };

  const handleAddSession = async (playerId: number, sessionData: Omit<Session, 'id' | 'playerId'>) => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...sessionData, playerId }),
    });
    const newSession: Session = await response.json();
    // Update sessions for the specific player
    setPlayerSessions(prev => ({
      ...prev,
      [playerId]: [...(prev[playerId] || []), newSession]
    }));
    // Re-fetch player stats to update dashboard
    const updatedPlayersResponse = await fetch('/api/players');
    const updatedPlayers = await updatedPlayersResponse.json();
    setPlayers(updatedPlayers);
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-3xl font-extrabold mb-6 text-center text-blue-400">Player Dashboard</h2>
      <div className="flex mb-6">
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          className="flex-grow bg-gray-800 text-white p-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          placeholder="Enter new player name"
        />
        <button
          onClick={handleAddPlayer}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-r-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105"
        >
          Add Player
        </button>
      </div>
      <div className="space-y-3">
        {players.length === 0 ? (
          <p className="text-gray-400 text-center text-lg">No players added yet. Add one above!</p>
        ) : (
          <ul className="space-y-3">
            {Array.isArray(players) && players.map((player) => (
              <li key={player.id} className="bg-gray-900 p-4 rounded-lg shadow-md border border-gray-700 transform transition duration-300 hover:scale-[1.02]">
                <PlayerCard
                  player={player}
                  stats={playerStats[player.id]}
                  sessions={playerSessions[player.id] || []}
                  onAddSession={handleAddSession}
                  onDeletePlayer={handleDeletePlayer}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface PlayerCardProps {
  player: Player;
  stats: { totalBuyIn: number; totalCashOut: number; netProfit: number; winRate: number; };
  sessions: Session[];
  onAddSession: (playerId: number, sessionData: Omit<Session, 'id' | 'playerId'>) => void;
  onDeletePlayer: (playerId: number) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, stats, sessions, onAddSession, onDeletePlayer }) => {
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionDate, setSessionDate] = useState('');
  const [gameType, setGameType] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');

  const router = useRouter();

  // Helper function for formatting date for input
  const formatLocalDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Treat as local date at midnight
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSessionSubmit = () => {
    if (!sessionDate || !gameType || !buyIn || !cashOut) {
      alert('Please fill all session fields.');
      return;
    }
    onAddSession(player.id, {
      sessionDate: sessionDate, // Use the sessionDate string directly from the input
      gameType,
      buyIn: parseFloat(buyIn),
      cashOut: parseFloat(cashOut),
    });
    setBuyIn('');
    setCashOut('');
    setGameType('');
    setSessionDate('');
    setShowAddSession(false);
  };

  // Provide default values for stats if it's undefined
  const safeStats = {
    totalBuyIn: Number(stats?.totalBuyIn) || 0,
    totalCashOut: Number(stats?.totalCashOut) || 0,
    netProfit: Number(stats?.netProfit) || 0,
    winRate: Number(stats?.winRate) || 0,
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
        <h3 className="text-xl font-bold text-blue-300 mb-2 md:mb-0">{player.name}</h3>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => router.push(`/analytics/${player.id}`)}
            className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded-lg text-sm font-semibold transition duration-200 ease-in-out"
          >
            View Analytics
          </button>
          <button
            onClick={() => onDeletePlayer(player.id)}
            className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-lg text-sm font-semibold transition duration-200 ease-in-out"
          >
            Delete Player
          </button>
        </div>
      </div>

      {/* Use safeStats for rendering */}
      {safeStats ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-300 mb-3">
          <p>Buy-in: <span className="font-medium text-yellow-400">₹{safeStats.totalBuyIn.toFixed(2)}</span></p>
          <p>Cash-out: <span className="font-medium text-green-400">₹{safeStats.totalCashOut.toFixed(2)}</span></p>
          <p>Net Profit: <span className={`font-bold ${safeStats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>₹{safeStats.netProfit.toFixed(2)}</span></p>
          <p>Win Rate: <span className="font-bold text-purple-400">%{safeStats.winRate.toFixed(2)}</span></p>
        </div>
      ) : (
        <p className="text-gray-400 mb-3">No sessions recorded yet.</p>
      )}

      <button
        onClick={() => setShowAddSession(!showAddSession)}
        className="w-full bg-purple-700 hover:bg-purple-800 text-white p-2 rounded-lg font-semibold transition duration-200 ease-in-out mb-3 shadow-md"
      >
        {showAddSession ? 'Hide Session Form' : 'Add New Session'}
      </button>

      {showAddSession && (
        <div className="bg-gray-800 p-3 rounded-lg shadow-inner mb-3">
          <h4 className="text-md font-bold text-blue-200 mb-2">Record Session for {player.name}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <input
              type="date"
              value={formatLocalDateForInput(sessionDate)}
              onChange={(e) => setSessionDate(e.target.value)}
              className="bg-gray-700 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="text"
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              className="bg-gray-700 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Game Type (e.g., NLH Cash)"
            />
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              className="bg-gray-700 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Buy-in Amount"
            />
            <input
              type="number"
              value={cashOut}
              onChange={(e) => setCashOut(e.target.value)}
              className="bg-gray-700 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Cash-out Amount"
            />
          </div>
          <button
            onClick={handleSessionSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg font-semibold transition duration-200 ease-in-out"
          >
            Record Session
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="bg-gray-800 p-3 rounded-lg shadow-inner">
          <h4 className="text-md font-bold text-blue-200 mb-2">Recent Sessions</h4>
          <ul className="space-y-1">
            {sessions.slice(-5).reverse().map(session => (
              <li key={session.id} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
                <span className="text-gray-200 text-xs">
                  {formatDateToDDMMYYYY(session.sessionDate)} - {session.gameType}: 
                  <span className={`font-bold ${session.cashOut - session.buyIn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{(session.cashOut - session.buyIn).toFixed(2)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlayerDashboard;
