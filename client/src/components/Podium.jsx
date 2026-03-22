import { getPlayerPhotoOrPlaceholder, getPlayerInitials } from '../playerPhotos';

function PodiumAvatar({ name, profilePicture, rank }) {
  const sizes = { 1: 'w-[130px] h-[130px]', 2: 'w-[100px] h-[100px]', 3: 'w-[90px] h-[90px]' };
  const borders = { 1: 'border-gold shadow-[0_0_24px_rgba(201,168,76,0.5)]', 2: 'border-silver', 3: 'border-bronze' };
  const src = getPlayerPhotoOrPlaceholder(name, profilePicture);
  if (src) {
    return <img src={src} alt={name} className={`${sizes[rank]} rounded-full object-cover object-top border-4 ${borders[rank]}`} />;
  }
  const initials = getPlayerInitials(name);
  return (
    <div className={`${sizes[rank]} rounded-full bg-felt-lighter border-4 ${borders[rank]} flex items-center justify-center font-bold text-2xl text-muted`}>
      {initials}
    </div>
  );
}

export default function Podium({ players }) {
  if (!players || players.length < 3) return null;

  const podiumOrder = [players[1], players[0], players[2]];
  const ranks = [2, 1, 3];
  const standHeights = ['h-[60px] w-[115px]', 'h-[80px] w-[145px]', 'h-[44px] w-[105px]'];
  const standGradients = [
    'bg-gradient-to-b from-silver to-[#555]',
    'bg-gradient-to-b from-gold to-[#7a5800]',
    'bg-gradient-to-b from-bronze to-[#5c3000]',
  ];
  const nameColors = ['text-text', 'text-light-gold', 'text-text'];
  const medals = ['\uD83E\uDD48', '\uD83E\uDD47', '\uD83E\uDD49'];
  const delays = ['podium-animate-delay-1', '', 'podium-animate-delay-2'];

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-4 mb-8 px-4">
      {podiumOrder.map((player, index) => (
        <div
          key={player.player_id || index}
          className={`flex flex-col items-center flex-1 max-w-[160px] podium-animate ${delays[index]}`}
        >
          {/* Trophy for 1st place */}
          {index === 1 && (
            <div className="text-3xl mb-1 animate-bounce">
              <span role="img" aria-label="trophy">&#127942;</span>
            </div>
          )}

          {/* Medal */}
          <div className="text-2xl mb-1">{medals[index]}</div>

          {/* Avatar */}
          <div className="relative mb-2">
            <PodiumAvatar
              name={player.name}
              profilePicture={player.profile_picture}
              rank={ranks[index]}
            />
            <div className={`absolute bottom-0 right-0 w-[30px] h-[30px] rounded-full flex items-center justify-center font-black text-xs border-2 border-dark ${
              ranks[index] === 1 ? 'bg-gold text-dark' :
              ranks[index] === 2 ? 'bg-silver text-dark' :
              'bg-bronze text-white'
            }`}>
              {ranks[index]}
            </div>
          </div>

          {/* Player name */}
          <div className={`text-sm sm:text-base font-bold mb-1 text-center ${nameColors[index]}`}>
            {player.name}
          </div>

          {/* Score */}
          <div className="text-xs sm:text-sm text-gold font-bold mb-2">
            {player.score != null ? player.score.toFixed(1) : '0'} pts
          </div>

          {/* Podium block */}
          <div
            className={`w-full ${standHeights[index]} ${standGradients[index]} rounded-t-md flex items-center justify-center`}
          >
            <span className="text-2xl sm:text-3xl font-black text-white/20">
              {ranks[index]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
