/**
 * Utilitário para geração de avatar padrão elegante e confiável.
 * Não depende de URLs externas temporárias ou serviços de terceiros que possam expirar.
 */

export const getDefaultAvatar = (name?: string): string => {
  const cleanName = (name || 'Usuário').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  
  let initials = 'U';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 1) {
    initials = parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }

  // Gera um SVG inline estilizado com degradê azul/índigo e iniciais do usuário
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366f1"/><stop offset="100%" stop-color="%234338ca"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(%23g)"/><text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="700" fill="%23ffffff" dominant-baseline="middle" text-anchor="middle">${initials}</text></svg>`;
};
