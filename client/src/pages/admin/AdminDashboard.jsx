import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPlayers, getTournaments } from '../../api';

export default function AdminDashboard() {
  const { isSuperAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activeTournaments: 0,
    completedMatches: 0,
    pendingDisputes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [players, tournaments] = await Promise.all([
        getPlayers(),
        getTournaments(),
      ]);

      const activeTournaments = tournaments.filter((t) => t.status === 'active');

      setStats({
        totalPlayers: players.length,
        activeTournaments: activeTournaments.length,
        completedMatches: 0,
        pendingDisputes: 0,
      });
    } catch {
      // Silently handle errors for stats
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Players', value: stats.totalPlayers, color: 'text-gold', icon: '👤' },
    { label: 'Active Tournaments', value: stats.activeTournaments, color: 'text-green-400', icon: '🏆' },
    { label: 'Pending Disputes', value: stats.pendingDisputes, color: 'text-red-400', icon: '⚠️' },
    { label: 'Completed Matches', value: stats.completedMatches, color: 'text-amber-400', icon: '✅' },
  ];

  const quickActions = [
    { label: 'Manage Players', path: '/admin/players', icon: '👥', desc: 'Add, edit, remove players' + (isSuperAdmin ? ', assign admin roles' : '') },
    { label: 'Manage Tournaments', path: '/admin/tournaments', icon: '🏆', desc: 'Create and manage tournaments' },
  ];

  return (
    <div className="py-6 fade-in-up">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-light-gold">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-felt-light rounded-lg p-4 border border-[#333]">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-muted mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-xl font-semibold text-text mb-4">Quick Actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="bg-felt-light rounded-lg p-5 border border-[#333] card-hover block"
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <h3 className="text-lg font-bold text-light-gold mb-1">{action.label}</h3>
            <p className="text-sm text-muted">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
