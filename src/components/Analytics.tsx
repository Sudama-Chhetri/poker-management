import React, { useState, useEffect } from 'react';

const formatDateToDDMMYYYY = (dateString: string) => {
  const datePart = dateString.split('T')[0]; // Extract YYYY-MM-DD part
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

interface AnalyticsProps {
  player: Player;
  onSessionChange: () => void;
  refreshKey: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ player, onSessionChange, refreshKey }) => {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const response = await fetch(`/api/sessions?playerId=${player.id}`);
      const data: Session[] = await response.json();
      const processedData = data.map(session => ({
        ...session,
        buyIn: parseFloat(session.buyIn as any),
        cashOut: parseFloat(session.cashOut as any),
        sessionDate: session.sessionDate, // Use the sessionDate string directly as it comes from the database
      }));
      setSessions(processedData);
    };
    fetchSessions();
  }, [player, refreshKey]); // Added refreshKey to dependencies

  const handleDeleteSession = async (sessionId: number) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      await fetch(`/api/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });
      setSessions(sessions.filter(session => session.id !== sessionId));
      onSessionChange(); // Notify parent of change
    }
  };

  const calculateStats = () => {
    let totalProfit = 0;
    let totalBuyIn = 0;
    let totalCashOut = 0;
    const cumulativeProfit: number[] = [];
    const betDistribution: { [key: string]: number } = {};
    const dailyProfit: { [key: string]: number } = {};

    sessions.sort((a, b) => {
      const [aY, aM, aD] = a.sessionDate.split('-').map(Number);
      const [bY, bM, bD] = b.sessionDate.split('-').map(Number);
      const dateA = new Date(aY, aM - 1, aD);
      const dateB = new Date(bY, bM - 1, bD);
      return dateA.getTime() - dateB.getTime();
    });

    sessions.forEach(session => {
      const profit = session.cashOut - session.buyIn;
      totalProfit += profit;
      totalBuyIn += session.buyIn;
      totalCashOut += session.cashOut;
      cumulativeProfit.push(totalProfit);

      // For bet distribution (simple example: categorize by buy-in amount)
      const buyInCategory = `${session.buyIn.toFixed(0)}`;
      betDistribution[buyInCategory] = (betDistribution[buyInCategory] || 0) + 1;

      // Daily analytics
      const date = session.sessionDate;
      dailyProfit[date] = (dailyProfit[date] || 0) + profit;
    });

    const winRate = sessions.length > 0 ? (sessions.filter(s => (s.cashOut - s.buyIn) > 0).length / sessions.length) * 100 : 0;

    return { totalProfit, totalBuyIn, totalCashOut, cumulativeProfit, winRate, betDistribution, dailyProfit };
  };

  const { totalProfit, totalBuyIn, totalCashOut, cumulativeProfit, winRate, betDistribution, dailyProfit } = calculateStats();

  const profitLossChartData = {
    labels: sessions.map((s, i) => `Session ${i + 1}`),
    datasets: [
      {
        label: 'Profit/Loss',
        data: sessions.map(s => s.cashOut - s.buyIn),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const cumulativeProfitChartData = {
    labels: sessions.map((s, i) => `Session ${i + 1}`),
    datasets: [
      {
        label: 'Cumulative Profit',
        data: cumulativeProfit,
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const betDistributionChartData = {
    labels: Object.keys(betDistribution),
    datasets: [
      {
        label: 'Number of Sessions',
        data: Object.values(betDistribution),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
      },
    ],
  };

  const dailyProfitChartData = {
    labels: Object.keys(dailyProfit).sort((a, b) => new Date(a + 'T00:00:00').getTime() - new Date(b + 'T00:00:00').getTime()),
    datasets: [
      {
        label: 'Daily Profit/Loss',
        data: Object.values(dailyProfit),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="bg-gray-950 p-6 rounded-lg shadow-xl border border-gray-800">
      <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-center text-yellow-400">{player.name}'s Analytics</h2>

      {/* Session List */}
      <div className="mb-8 p-4 bg-gray-900 rounded-lg shadow-inner border border-gray-800">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-300">Recorded Sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-gray-400 text-base">No sessions recorded for this player yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map(session => (
              <li key={session.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800 p-3 rounded-lg border border-gray-700 text-sm md:text-base">
                <span className="text-gray-200 mb-2 sm:mb-0">{formatDateToDDMMYYYY(session.sessionDate)} - {session.gameType} (Buy-in: ₹{session.buyIn.toFixed(2)}, Cash-out: ₹{session.cashOut.toFixed(2)})</span>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-lg text-sm font-semibold flex-shrink-0"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center">
        <div className="bg-gray-900 p-4 rounded-lg shadow-md border border-gray-800">
          <p className="text-base md:text-lg text-gray-400">Total Buy-in</p>
          <p className="text-xl md:text-2xl font-bold text-yellow-400">₹{totalBuyIn.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-md border border-gray-800">
          <p className="text-base md:text-lg text-gray-400">Total Cash-out</p>
          <p className="text-xl md:text-2xl font-bold text-green-400">₹{totalCashOut.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-md border border-gray-800">
          <p className="text-base md:text-lg text-gray-400">Net Profit</p>
          <p className={`text-xl md:text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>₹{totalProfit.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-md border border-gray-800 col-span-full">
          <p className="text-base md:text-lg text-gray-400">Win Rate</p>
          <p className="text-xl md:text-2xl font-bold text-purple-400">{winRate.toFixed(2)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-4 rounded-lg shadow-md h-64 md:h-80 border border-gray-800">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-300">Profit/Loss Per Session</h3>
          <Line data={profitLossChartData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-md h-64 md:h-80 border border-gray-800">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-300">Cumulative Profit Over Time</h3>
          <Line data={cumulativeProfitChartData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-md h-64 md:h-80 border border-gray-800">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-300">Bet Distribution</h3>
          <Bar data={betDistributionChartData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-md h-64 md:h-80 border border-gray-800">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-300">Daily Profit/Loss</h3>
          <Line data={dailyProfitChartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;