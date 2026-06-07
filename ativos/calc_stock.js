import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's get all assets
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, name, status, value');

  if (error) {
    console.error("Error fetching assets:", error);
    process.exit(1);
  }

  let totalValue = 0;
  let stockValue = 0;
  let inUseValue = 0;

  assets.forEach(a => {
    const val = Number(a.value) || 0;
    totalValue += val;
    if (a.status === 'Armazenado') {
      stockValue += val;
    } else if (a.status === 'Em Uso') {
      inUseValue += val;
    }
  });

  console.log(`Total Assets Value: R$ ${totalValue.toFixed(2)}`);
  console.log(`Assets in Stock (Armazenado) Value: R$ ${stockValue.toFixed(2)}`);
  console.log(`Assets in Use (Em Uso) Value: R$ ${inUseValue.toFixed(2)}`);
}

run();
