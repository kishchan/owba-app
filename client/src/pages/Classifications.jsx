import { useState, useEffect } from 'react';
import { getPlayers } from '../api';
import PlayerPhotoLightbox from '../components/PlayerPhotoLightbox';
import { getPlayerPhotoOrPlaceholder, getPlayerInitials } from '../playerPhotos';

function ClassBadge({ classification }) {
  const cls = classification?.toUpperCase();
  const styles = {
    A: 'bg-gold/20 text-light-gold border border-gold/40',
    B: 'bg-green/25 text-green-400 border border-green/40',
    C: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide ${styles[cls] || styles.C}`}>
      Class {cls || '?'}
    </span>
  );
}

const CLASS_CONFIG = [
  {
    key: 'A',
    label: 'Class A',
    accent: 'border-gold',
    headerBg: 'linear-gradient(90deg, #0f4225, #3a2a00)',
    headerText: 'text-light-gold',
  },
  {
    key: 'B',
    label: 'Class B',
    accent: 'border-green',
    headerBg: 'linear-gradient(90deg, #0f4225, #1a6b3a)',
    headerText: 'text-green-400',
  },
  {
    key: 'C',
    label: 'Class C',
    accent: 'border-blue-500',
    headerBg: 'linear-gradient(90deg, #0f4225, #1a3a6b)',
    headerText: 'text-blue-300',
  },
];

export default function Classifications() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const openLightbox = (src, name) => setLightbox({ src, name });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPlayers();
      setPlayers(data);
    } catch (err) {
      setError(err.message);
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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchPlayers}
          className="mt-4 px-4 py-2 bg-green hover:bg-dark-green text-light-gold rounded-lg transition-colors border border-gold/30"
        >
          Retry
        </button>
      </div>
    );
  }

  // Group players by classification
  const grouped = { A: [], B: [], C: [] };
  players.forEach((player) => {
    const cls = player.classification?.toUpperCase();
    if (cls === 'A' || cls === 'B' || cls === 'C') {
      grouped[cls].push(player);
    } else {
      grouped.C.push(player);
    }
  });

  // Sort each group alphabetically
  Object.values(grouped).forEach((list) =>
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  );

  return (
    <div className="py-6 fade-in-up">
      {/* Hero */}
      <div
        className="text-center mb-8 py-6 rounded-lg border-b border-[#333]"
        style={{ background: 'linear-gradient(180deg, #0f4225 0%, #0d0d0d 100%)' }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gold uppercase tracking-wider">
          Player Classifications
        </h1>
        <p className="text-muted text-sm mt-1">
          {players.length} Registered Player{players.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Classification sections */}
      <div className="space-y-8">
        {CLASS_CONFIG.map(({ key, label, accent, headerBg, headerText }) => {
          const list = grouped[key];
          return (
            <div key={key} className={`rounded-xl border border-[#333] overflow-hidden`}>
              {/* Section header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: headerBg }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-6 rounded-full ${accent}`} style={{ backgroundColor: 'currentColor' }}></div>
                  <h2 className={`text-lg font-bold uppercase tracking-wider ${headerText}`}>
                    {label}
                  </h2>
                </div>
                <span className={`text-sm font-semibold ${headerText}`}>
                  {list.length} Player{list.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Player cards */}
              {list.length > 0 ? (
                <div className="divide-y divide-[#2a2a2a]">
                  {list.map((player, i) => (
                    <div
                      key={player.id || player.owba_id || i}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors ${
                        i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const photoSrc = getPlayerPhotoOrPlaceholder(player.name, player.profile_picture);
                          if (photoSrc) {
                            return <img src={photoSrc} alt={player.name} className="w-8 h-8 rounded-full object-cover object-top border border-[#444] cursor-pointer" onClick={() => openLightbox(photoSrc, player.name)} />;
                          }
                          return <div className="w-8 h-8 rounded-full bg-felt-light border border-[#444] flex items-center justify-center text-xs font-bold text-muted">{getPlayerInitials(player.name)}</div>;
                        })()}
                        <span className="font-semibold text-sm">{player.name}</span>
                      </div>
                      <ClassBadge classification={player.classification} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted text-sm">
                  No players in this classification.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {players.length === 0 && (
        <div className="text-center py-12 text-muted">
          No players registered yet.
        </div>
      )}

      {lightbox && (
        <PlayerPhotoLightbox src={lightbox.src} alt={lightbox.name} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
