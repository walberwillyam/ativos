require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function sync() {
  console.log("Buscando dispositivos de telemetria...");
  const { data: devices, error: devErr } = await supabase.from('devices_health').select('*');
  if (devErr) {
    console.error(devErr);
    return;
  }

  const { data: assets, error: assErr } = await supabase.from('assets').select('id');
  if (assErr) {
    console.error(assErr);
    return;
  }

  const assetIds = new Set(assets.map(a => a.id));

  for (const device of devices) {
    if (!assetIds.has(device.asset_id)) {
      console.log(`Ativo ${device.asset_id} está na telemetria mas falta no inventário. Recriando...`);
      
      let unitName = device.unit_id;
      const { data: unitData } = await supabase.from('units').select('name').eq('id', device.unit_id).single();
      if (unitData) unitName = unitData.name;

      const newAsset = {
        id: device.asset_id,
        patrimonio: 'AUTO-' + device.asset_id.substring(0, 6),
        name: device.custom_name || `Computador - ${device.asset_id}`,
        category: 'Computadores',
        model: device.os_info || 'Desconhecido',
        serialNumber: 'N/A',
        unit: unitName,
        location: device.sector || 'Não definida',
        currentFloor: 'office',
        mapCoordinates: { x: 50, y: 50 },
        responsible: { name: "Não atribuído", initials: "NA", role: "Usuário" },
        status: 'Em Uso',
        value: 0,
        acquisitionDate: new Date().toISOString().split('T')[0],
        warrantyExpiry: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        specifications: { cpu: `${device.cpu_usage}%`, ram: `${device.ram_total} GB`, disk: `${device.disk_total} GB` },
        history: [],
        imageUrl: ''
      };

      const { error: insErr } = await supabase.from('assets').insert([newAsset]);
      if (insErr) {
        console.error(`Erro ao inserir ${device.asset_id}:`, insErr);
      } else {
        console.log(`✅ Ativo ${device.asset_id} recriado com sucesso!`);
      }
    }
  }
}

sync();
