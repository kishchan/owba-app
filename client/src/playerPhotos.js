// Maps player full names to their photo filenames in /players/
const PLAYER_PHOTO_MAP = {
  'Daniel Chata': '/players/Daniel Chata.jpeg',
  'Miguel Chata': '/players/Miguel Chata.jpeg',
  'Nain Rosado': '/players/Nain Rosado.jpeg',
  'Zair Perera': '/players/Zair P.jpeg',
  'Ernest Arzu': '/players/Ernest Arzu.jpeg',
  'Javier Chata': '/players/Javier.jpeg',
  'Jose Chata': '/players/Jose Chata.jpeg',
  'Argel Perera': '/players/Argel P.jpeg',
  'Heraldo Carballo': '/players/Heraldo.jpeg',
  'Kenneth Dawson': '/players/Kenneth.jpeg',
  'Ricardo Carcaño': '/players/Ricardo.jpeg',
  'Leroy Jacobs': '/players/Leroy Jacob.jpeg',
};

export function getPlayerPhoto(name) {
  return PLAYER_PHOTO_MAP[name] || null;
}

export function getPlayerInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function getPlaceholderUrl(name) {
  const initials = getPlayerInitials(name);
  return `https://placehold.co/34x34/2e2e2e/aaa?text=${initials}`;
}

export function getPlayerPhotoOrPlaceholder(name, profilePicture) {
  // If user has uploaded their own, use that
  if (profilePicture) return profilePicture;
  // Check known player photos
  const photo = getPlayerPhoto(name);
  if (photo) return photo;
  // Return null to indicate initials should be used
  return null;
}
