export function displayNameFromEmail(email = '') {
  const local = email.split('@')[0] || 'user';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

export function initialsFromEmail(email = '') {
  const name = displayNameFromEmail(email);
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
