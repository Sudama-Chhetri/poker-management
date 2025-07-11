'use client';

import React, { useState, useEffect, useMemo } from 'react';

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

const OverallAnalyticsPage: React.FC = () => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const playersResponse = await fetch('/api/players', { cache: 'no-store' });
      const playersData: Player[] = await playersResponse.json();
      setAllPlayers(playersData);

      const sessionsResponse = await fetch('/api/sessions', { cache: 'no-store' });
      const sessionsData: Session[] = await sessionsResponse.json();
      const processedSessionsData = sessionsData.map(session => ({
        ...session,
        buyIn: parseFloat(session.buyIn as any),
        cashOut: parseFloat(session.cashOut as any),
        sessionDate: session.sessionDate, // Use the sessionDate string directly as it comes from the database
      }));
      setAllSessions(processedSessionsData);
    };
    fetchData();
  }, []);

  const calculateOverallStats = () => {
    const filteredSessions = selectedDate
      ? allSessions.filter(session => {
          const [sYear, sMonth, sDay] = session.sessionDate.split('-').map(Number);
          const sessionDateObj = new Date(sYear, sMonth - 1, sDay); // Month is 0-indexed

          const [fYear, fMonth, fDay] = selectedDate.split('-').map(Number);
          const filterDateObj = new Date(fYear, fMonth - 1, fDay); // Month is 0-indexed

          return (
            sessionDateObj.getFullYear() === filterDateObj.getFullYear() &&
            sessionDateObj.getMonth() === filterDateObj.getMonth() &&
            sessionDateObj.getDate() === filterDateObj.getDate()
          );
        })
      : allSessions;
    const playerProfits: { [key: number]: number } = {};
    const playerSessionCounts: { [key: number]: number } = {};
    const playerWinCounts: { [key: number]: number } = {};
    let overallTotalProfit = 0;
    let overallTotalBuyIn = 0;
    let overallTotalCashOut = 0;
    const overallDailyProfit: { [key: string]: number } = {};
    const overallCumulativeProfit: number[] = [];

    // Initialize player stats only for players who have sessions in the filtered set
    const uniquePlayerIdsInFilteredSessions = new Set<number>();
    filteredSessions.forEach(session => {
      uniquePlayerIdsInFilteredSessions.add(session.playerId);
    });

    const playersInFilteredSessions = allPlayers.filter(p => uniquePlayerIdsInFilteredSessions.has(p.id));

    playersInFilteredSessions.forEach(p => {
      playerProfits[p.id] = 0;
      playerSessionCounts[p.id] = 0;
      playerWinCounts[p.id] = 0;
    });

    // Sort sessions by date for cumulative profit calculation
    const sortedSessions = [...filteredSessions].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());

    sortedSessions.forEach(session => {
      const profit = session.cashOut - session.buyIn;
      overallTotalProfit += profit;
      overallTotalBuyIn += session.buyIn;
      overallTotalCashOut += session.cashOut;
      overallCumulativeProfit.push(overallTotalProfit);

      if (playerProfits[session.playerId] !== undefined) {
        playerProfits[session.playerId] += profit;
        playerSessionCounts[session.playerId]++;
        if (profit > 0) {
          playerWinCounts[session.playerId]++;
        }
      }

      const date = session.sessionDate; // Ensure YYYY-MM-DD format
      overallDailyProfit[date] = (overallDailyProfit[date] || 0) + profit;
    });

    // These should now be based on playersInFilteredSessions
    const playerNames = playersInFilteredSessions.map(p => p.name);
    const netProfits = playersInFilteredSessions.map(p => playerProfits[p.id] || 0);
    const winRates = playersInFilteredSessions.map(p => playerSessionCounts[p.id] > 0 ? (playerWinCounts[p.id] / playerSessionCounts[p.id]) * 100 : 0);

    return {
      playerNames,
      netProfits,
      winRates,
      overallTotalProfit,
      overallTotalBuyIn,
      overallTotalCashOut,
      overallDailyProfit,
      overallCumulativeProfit,
    };
  };

  const { playerNames, netProfits, winRates, overallTotalProfit, overallTotalBuyIn, overallTotalCashOut, overallDailyProfit, overallCumulativeProfit } = useMemo(() => calculateOverallStats(), [allSessions, selectedDate]);

  if (allPlayers.length === 0 && allSessions.length === 0) {
    return <div className="bg-gray-950 text-white min-h-screen p-8 flex justify-center items-center text-xl">Loading overall analytics...</div>;
  }

  const netProfitChartData = {
    labels: playerNames,
    datasets: [
      {
        label: 'Net Profit',
        data: netProfits,
        backgroundColor: netProfits.map(profit => profit >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'),
      },
    ],
  };

  const winRateChartData = {
    labels: playerNames,
    datasets: [
      {
        label: 'Win Rate (%)',
        data: winRates,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  };

  const overallDailyProfitChartData = {
    labels: Object.keys(overallDailyProfit).sort((a, b) => a.localeCompare(b)),
    datasets: [
      {
        label: 'Overall Daily Profit/Loss',
        data: Object.values(overallDailyProfit),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const overallCumulativeProfitChartData = {
    labels: overallCumulativeProfit.map((_, i) => `Session ${i + 1}`),
    datasets: [
      {
        label: 'Overall Cumulative Profit',
        data: overallCumulativeProfit,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#E5E7EB', // gray-200
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#D1D5DB', // gray-300
          autoSkip: true, // Allow labels to be skipped if they overlap
          autoSkipPadding: 15, // Increased padding between skipped labels
          maxRotation: 0, // Prevent labels from rotating
          minRotation: 0,
          font: {
            size: 8, // Even smaller font size for mobile
          },
          padding: 5, // Add padding around labels
        },
        grid: {
          display: false, // Remove grid lines
        },
      },
      y: {
        ticks: {
          color: '#D1D5DB', // gray-300
          callback: function(value: any) {
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
          },
          font: {
            size: 8, // Even smaller font size for mobile
          },
        },
        grid: {
          display: false, // Remove grid lines
        },
      },
    },
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-yellow-400">Overall Player Analytics</h1>

      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-center items-center space-y-3 md:space-y-0 md:space-x-4">
        <label htmlFor="sessionDate" className="text-base sm:text-lg font-semibold text-gray-300">Filter by Date:</label>
        <input
          type="date"
          id="sessionDate"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-800 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-gray-700 w-full md:w-auto"
        />
      </div>

      {/* Overall Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 text-center">
        <div className="bg-gray-900 p-3 sm:p-4 rounded-lg shadow-md border border-gray-800">
          <p className="text-sm sm:text-base md:text-lg text-gray-400">Overall Total Buy-in</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-400">₹{overallTotalBuyIn.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 p-3 sm:p-4 rounded-lg shadow-md border border-gray-800">
          <p className="text-sm sm:text-base md:text-lg text-gray-400">Overall Total Cash-out</p>
          <p className="text-xl sm:text-2xl font-bold text-green-400">₹{overallTotalCashOut.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 p-3 sm:p-4 rounded-lg shadow-md border border-gray-800">
          <p className="text-sm sm:text-base md:text-lg text-gray-400">Overall Net Profit</p>
          <p className={`text-xl sm:text-2xl font-bold ${overallTotalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>₹{overallTotalProfit.toFixed(2)}</p>
        </div>
      </div>

      {/* All Sessions List by Date */}
      <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-gray-900 rounded-lg shadow-xl border border-gray-800">
        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-yellow-300">All Recorded Sessions (Day-wise)</h3>
        {Object.keys(overallDailyProfit).length === 0 ? (
          <p className="text-gray-400 text-sm sm:text-base">No sessions recorded for the selected date.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(overallDailyProfit).sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).map(([date, profit]) => (
              <li key={date} className="flex justify-between items-center bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-700 text-xs sm:text-sm md:text-base">
                <span className="text-gray-200 font-semibold">{formatDateToDDMMYYYY(date)}:</span>
                <span className={`font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{profit.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-gray-900 p-3 md:p-4 rounded-lg shadow-xl h-56 md:h-72 border border-gray-700">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-yellow-300">Net Profit by Player</h3>
          <Bar data={netProfitChartData} options={chartOptions} />
        </div>
        <div className="bg-gray-900 p-3 md:p-4 rounded-lg shadow-xl h-56 md:h-72 border border-gray-700">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-yellow-300">Win Rate by Player</h3>
          <Bar data={winRateChartData} options={chartOptions} />
        </div>
        <div className="bg-gray-900 p-3 md:p-4 rounded-lg shadow-xl h-56 md:h-72 border border-gray-700">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-yellow-300">Overall Daily Profit/Loss</h3>
          <Line data={overallDailyProfitChartData} options={chartOptions} />
        </div>
        <div className="bg-gray-900 p-3 md:p-4 rounded-lg shadow-xl h-56 md:h-72 border border-gray-700">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-yellow-300">Overall Cumulative Profit Over Time</h3>
          <Line data={overallCumulativeProfitChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default OverallAnalyticsPage;