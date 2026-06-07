-- ==========================================
-- 1. CRIAR A FUNÇÃO DO GATILHO
-- ==========================================
CREATE OR REPLACE FUNCTION public.auto_create_asset_from_telemetry()
RETURNS TRIGGER AS $$
DECLARE
  v_unit_name TEXT;
BEGIN
  -- Verificar se o ativo (computador) já existe no inventário
  IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = NEW.asset_id) THEN
    
    -- Tentar descobrir o nome legível da unidade baseando-se no unit_id
    SELECT name INTO v_unit_name FROM public.units WHERE id = NEW.unit_id;
    
    -- Se não encontrar a unidade (ex: foi deletada), usa o ID como fallback
    IF v_unit_name IS NULL THEN
      v_unit_name := NEW.unit_id; 
    END IF;

    -- Cadastra o computador na tabela de inventário com valores padrão
    INSERT INTO public.assets (
      id, 
      patrimonio, 
      name, 
      category, 
      model, 
      "serialNumber", 
      unit, 
      location, 
      "currentFloor",
      "mapCoordinates",
      responsible,
      status,
      value,
      "acquisitionDate",
      "warrantyExpiry",
      specifications,
      history,
      "imageUrl"
    ) VALUES (
      NEW.asset_id,
      'AUTO-' || SUBSTRING(NEW.asset_id FROM 1 FOR 6), -- Ex: AUTO-ATV-001
      COALESCE(NEW.custom_name, 'Computador - ' || NEW.asset_id),
      'Computadores',
      COALESCE(NEW.os_info, 'Desconhecido'),
      'N/A',
      v_unit_name,
      COALESCE(NEW.sector, 'Não definida'),
      'office',
      '{"x":50,"y":50}'::jsonb,
      '{"name": "Não atribuído", "initials": "NA", "role": "Usuário"}'::jsonb,
      'Em Uso',
      0,
      TO_CHAR(NOW(), 'YYYY-MM-DD'),
      TO_CHAR(NOW() + INTERVAL '1 year', 'YYYY-MM-DD'),
      ('{"cpu": "' || NEW.cpu_usage || '%", "ram": "' || NEW.ram_total || ' GB", "disk": "' || NEW.disk_total || ' GB"}')::jsonb,
      '[]'::jsonb,
      ''
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. VINCULAR O GATILHO À TABELA DE SAÚDE
-- ==========================================
DROP TRIGGER IF EXISTS trg_auto_create_asset ON public.devices_health;
CREATE TRIGGER trg_auto_create_asset
AFTER INSERT ON public.devices_health
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_asset_from_telemetry();

-- ==========================================
-- 3. CADASTRAR OS EQUIPAMENTOS ANTIGOS
-- ==========================================
-- Como já tem 2 robôs rodando (Servidor Terminal e ATV-001), 
-- este código abaixo simula a chamada para cadastrá-los na tabela de inventário agora mesmo.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT asset_id, unit_id, custom_name, os_info, sector, cpu_usage, ram_total, disk_total FROM public.devices_health LOOP
    IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = rec.asset_id) THEN
      
      INSERT INTO public.assets (
        id, patrimonio, name, category, model, "serialNumber", unit, location, "currentFloor", "mapCoordinates", responsible, status, value, "acquisitionDate", "warrantyExpiry", specifications, history, "imageUrl"
      ) VALUES (
        rec.asset_id,
        'AUTO-' || SUBSTRING(rec.asset_id FROM 1 FOR 6),
        COALESCE(rec.custom_name, 'Computador - ' || rec.asset_id),
        'Computadores',
        COALESCE(rec.os_info, 'Desconhecido'),
        'N/A',
        COALESCE((SELECT name FROM public.units WHERE id = rec.unit_id), rec.unit_id),
        COALESCE(rec.sector, 'Não definida'),
        'office',
        '{"x":50,"y":50}'::jsonb,
        '{"name": "Não atribuído", "initials": "NA", "role": "Usuário"}'::jsonb,
        'Em Uso',
        0,
        TO_CHAR(NOW(), 'YYYY-MM-DD'),
        TO_CHAR(NOW() + INTERVAL '1 year', 'YYYY-MM-DD'),
        ('{"cpu": "' || rec.cpu_usage || '%", "ram": "' || rec.ram_total || ' GB", "disk": "' || rec.disk_total || ' GB"}')::jsonb,
        '[]'::jsonb,
        ''
      );
      
    END IF;
  END LOOP;
END;
$$;
