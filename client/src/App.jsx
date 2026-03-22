import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Rankings from './pages/Rankings';
import TournamentView from './pages/TournamentView';
import Classifications from './pages/Classifications';
import Rules from './pages/Rules';
import Events from './pages/Events';
import Documents from './pages/Documents';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import AddGame from './pages/AddGame';
import EnterScore from './pages/EnterScore';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagePlayers from './pages/admin/ManagePlayers';
import ManageTournaments from './pages/admin/ManageTournaments';
import ManageTeams from './pages/admin/ManageTeams';
import ManageMatches from './pages/admin/ManageMatches';

function HomePage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/my-page" replace />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Dynamic home page based on auth state */}
        <Route path="/" element={<HomePage />} />
        <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
        <Route path="/tournaments" element={<ProtectedRoute><TournamentView /></ProtectedRoute>} />
        <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentView /></ProtectedRoute>} />
        <Route path="/classifications" element={<ProtectedRoute><Classifications /></ProtectedRoute>} />
        <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />

        {/* Unified player page */}
        <Route
          path="/my-page"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />

        {/* Legacy redirects */}
        <Route path="/dashboard" element={<Navigate to="/my-page" replace />} />
        <Route path="/my-stats" element={<Navigate to="/my-page" replace />} />
        <Route path="/profile" element={<Navigate to="/my-page" replace />} />

        <Route
          path="/add-game"
          element={
            <ProtectedRoute>
              <AddGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enter-score/:matchId/:gameId"
          element={
            <ProtectedRoute>
              <EnterScore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/players"
          element={
            <ProtectedRoute requireAdmin>
              <ManagePlayers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tournaments"
          element={
            <ProtectedRoute requireAdmin>
              <ManageTournaments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tournaments/:id/teams"
          element={
            <ProtectedRoute requireAdmin>
              <ManageTeams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tournaments/:id/matches"
          element={
            <ProtectedRoute requireAdmin>
              <ManageMatches />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="text-center py-20">
              <h1 className="text-4xl font-bold text-gold mb-4">404</h1>
              <p className="text-muted">Page not found</p>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}
