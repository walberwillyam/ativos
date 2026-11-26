import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Cliente anônimo sem sessão de usuário.
 * Útil para fallbacks em tabelas com políticas RLS abertas ao público/anon,
 * garantindo resiliência total mesmo se o token JWT tiver permissão divergente.
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

/**
 * Função de logout robusta e à prova de falhas:
 * 1. Tenta deslogar no servidor Supabase com timeout de 1.5s (evita travar a UI).
 * 2. Em caso de lentidão ou falha de rede, força o encerramento do escopo local.
 * 3. Limpa todas as chaves de sessão e tokens do Supabase no localStorage.
 * 4. Redireciona/recarrega para a tela inicial de autenticação limpa.
 */
export const logout = async () => {
  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SignOut Timeout')), 1500))
    ]);
  } catch (err) {
    console.warn("Aviso ao encerrar sessão remotamente, forçando saída local:", err);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      // Ignora erro local
    }
  } finally {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Erro ao limpar localStorage:", e);
    }

    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = cleanUrl;
  }
};

/**
 * Colunas reais existentes na tabela 'assets' do Supabase.
 * Remove quaisquer propriedades de UI em tempo de execução para evitar erro PGRST204.
 */
const DB_ASSET_COLUMNS = new Set([
  'id',
  'patrimonio',
  'name',
  'category',
  'model',
  'serialNumber',
  'unit',
  'location',
  'currentFloor',
  'mapCoordinates',
  'responsible',
  'status',
  'value',
  'acquisitionDate',
  'warrantyExpiry',
  'specifications',
  'history',
  'imageUrl'
]);

export function sanitizeAssetForDb<T extends Record<string, any>>(asset: T): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(asset)) {
    if (DB_ASSET_COLUMNS.has(key) && val !== undefined) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Colunas reais existentes na tabela 'units' do Supabase.
 */
const DB_UNIT_COLUMNS = new Set([
  'id',
  'name',
  'city',
  'address',
  'manager',
  'email',
  'partitions'
]);

export function sanitizeUnitForDb<T extends Record<string, any>>(unit: T): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(unit)) {
    if (DB_UNIT_COLUMNS.has(key) && val !== undefined) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

