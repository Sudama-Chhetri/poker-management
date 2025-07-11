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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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
    const filteredSessions = (startDate || endDate)
      ? allSessions.filter(session => {
          // --- Start of Debugging Logs ---
          const sessionDateStr = session.sessionDate.split('T')[0];
          console.log(`Processing session date: ${sessionDateStr}, Filter Start: ${startDate}, Filter End: ${endDate}`);

          const sessionDateParts = sessionDateStr.split('-').map(Number);
          const sessionTimestamp = Date.UTC(sessionDateParts[0], sessionDateParts[1] - 1, sessionDateParts[2]);

          let startTimestamp = null;
          if (startDate) {
            const startDateParts = startDate.split('-').map(Number);
            startTimestamp = Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
          }

          let endTimestamp = null;
          if (endDate) {
            const endDateParts = endDate.split('-').map(Number);
            endTimestamp = Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);
          }
          
          console.log(`Timestamps -> Session: ${sessionTimestamp}, Start: ${startTimestamp}, End: ${endTimestamp}`);
          // --- End of Debugging Logs ---

          if (startTimestamp && sessionTimestamp < startTimestamp) {
            return false;
          }

          if (endTimestamp && sessionTimestamp > endTimestamp) {
            return false;
          }

          return true;
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

  const { playerNames, netProfits, winRates, overallTotalProfit, overallTotalBuyIn, overallTotalCashOut, overallDailyProfit, overallCumulativeProfit } = useMemo(() => calculateOverallStats(), [allSessions, startDate, endDate]);

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
          autoSkip: true,
          autoSkipPadding: 30, // Increased padding to encourage more aggressive skipping
          maxRotation: 0, // Ensure no rotation
          minRotation: 0, // Ensure no rotation
          font: {
            size: 8, // Keep font size small for mobile
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: '#D1D5DB', // gray-300
          callback: function(value: any) {
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
          },
          font: {
            size: 8, // Smaller font size for mobile
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-yellow-400">Overall Player Analytics</h1>

      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-center items-center space-y-3 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2">
            <label htmlFor="startDate" className="text-base sm:text-lg font-semibold text-gray-300">From:</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-gray-700"
            />
        </div>
        <div className="flex items-center space-x-2">
            <label htmlFor="endDate" className="text-base sm:text-lg font-semibold text-gray-300">To:</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-gray-700"
            />
        </div>
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
          <p className="text-gray-400 text-sm sm:text-base">No sessions recorded for the selected date range.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700">
          <h3 className="text-xl font-bold mb-4 text-yellow-300">Net Profit by Player</h3>
          <div className="relative h-96">
            <Bar data={netProfitChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700">
          <h3 className="text-xl font-bold mb-4 text-yellow-300">Win Rate by Player</h3>
          <div className="relative h-96">
            <Bar data={winRateChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700">
          <h3 className="text-xl font-bold mb-4 text-yellow-300">Overall Daily Profit/Loss</h3>
          <div className="relative h-96">
            <Line data={overallDailyProfitChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700">
          <h3 className="text-xl font-bold mb-4 text-yellow-300">Overall Cumulative Profit Over Time</h3>
          <div className="relative h-96">
            <Line data={overallCumulativeProfitChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallAnalyticsPage;