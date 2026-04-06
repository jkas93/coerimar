-- =============================================================
-- MIGRACIÓN P.U.L.S.O. - SISTEMA DE PRODUCTOS Y ELEMENTOS
-- =============================================================

-- ==========================================
-- PARTE 0: LIMPIEZA PREVIA Y SEGURIDAD
-- ==========================================
DROP TABLE IF EXISTS element_checks CASCADE;
DROP TABLE IF EXISTS product_elements CASCADE;
DROP TABLE IF EXISTS productos CASCADE;

CREATE OR REPLACE FUNCTION public.soy_miembro_del_proyecto(proyecto_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proyecto_id AND user_id = auth.uid()
  );
$$;

-- ==========================================
-- PARTE A: NUEVAS TABLAS
-- ==========================================

-- 1. Tabla PRODUCTOS (Aparejos, Winches, etc)
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  codigo_unico TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, codigo_unico)
);

-- 2. Tabla PRODUCT_ELEMENTS (Los sub-componentes de cada producto)
CREATE TABLE IF NOT EXISTS product_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  element_type TEXT NOT NULL CHECK (element_type IN (
    'rodamientos', 'cancamos', 'pines', 'poleas', 'cascos'
  )),
  codigo_unico TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producto_id, element_type, codigo_unico)
);

-- 3. Tabla ELEMENT_CHECKS (Un check de un elemento físico específico en una actividad)
CREATE TABLE IF NOT EXISTS element_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  product_element_id UUID NOT NULL REFERENCES product_elements(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, product_element_id)
);

-- 4. Nueva columna cant_productos en projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cant_productos INTEGER DEFAULT 0;

-- ==========================================
-- PARTE B: ELIMINACIÓN DE LEGACY COLUMNS
-- ==========================================

ALTER TABLE projects 
  DROP COLUMN IF EXISTS cant_aparejos_reparar,
  DROP COLUMN IF EXISTS cant_aparejos_irreparables,
  DROP COLUMN IF EXISTS codigos_aparejos,
  DROP COLUMN IF EXISTS cant_rodamientos_cambiar,
  DROP COLUMN IF EXISTS codigos_rodamientos,
  DROP COLUMN IF EXISTS cant_cancamos_cambiar,
  DROP COLUMN IF EXISTS codigos_cancamos,
  DROP COLUMN IF EXISTS cant_pines_cambiar,
  DROP COLUMN IF EXISTS codigos_pines;

ALTER TABLE daily_progress DROP COLUMN IF EXISTS completed_codes;

-- ==========================================
-- PARTE C: ÍNDICES DE RENDIMIENTO
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_productos_project ON productos(project_id);
CREATE INDEX IF NOT EXISTS idx_product_elements_producto ON product_elements(producto_id);
CREATE INDEX IF NOT EXISTS idx_element_checks_activity ON element_checks(activity_id);
CREATE INDEX IF NOT EXISTS idx_element_checks_pe ON element_checks(product_element_id);
CREATE INDEX IF NOT EXISTS idx_element_checks_lookup ON element_checks(activity_id, product_element_id);

-- ==========================================
-- PARTE D: ROW LEVEL SECURITY (RLS) ANTI-RECURSIÓN
-- ==========================================

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_checks ENABLE ROW LEVEL SECURITY;

-- PRODUCTOS
DROP POLICY IF EXISTS "Lectura Productos Inmune" ON productos;
CREATE POLICY "Lectura Productos Inmune" ON productos FOR SELECT TO authenticated
USING (EXISTS(
  SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.soy_miembro_del_proyecto(p.id))
));

DROP POLICY IF EXISTS "Gestion Dueño Productos" ON productos;
CREATE POLICY "Gestion Dueño Productos" ON productos FOR ALL TO authenticated
USING (EXISTS(
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "Anon Leer Productos" ON productos;
CREATE POLICY "Anon Leer Productos" ON productos FOR SELECT TO anon 
USING (EXISTS(
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.share_token IS NOT NULL
));

-- PRODUCT_ELEMENTS
DROP POLICY IF EXISTS "Lectura Product Elements Inmune" ON product_elements;
CREATE POLICY "Lectura Product Elements Inmune" ON product_elements FOR SELECT TO authenticated
USING (EXISTS(
  SELECT 1 FROM productos pr 
  JOIN projects p ON pr.project_id = p.id 
  WHERE pr.id = producto_id AND (p.owner_id = auth.uid() OR public.soy_miembro_del_proyecto(p.id))
));

DROP POLICY IF EXISTS "Gestion Dueño Product Elements" ON product_elements;
CREATE POLICY "Gestion Dueño Product Elements" ON product_elements FOR ALL TO authenticated
USING (EXISTS(
  SELECT 1 FROM productos pr 
  JOIN projects p ON pr.project_id = p.id 
  WHERE pr.id = producto_id AND p.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "Anon Leer Product Elements" ON product_elements;
CREATE POLICY "Anon Leer Product Elements" ON product_elements FOR SELECT TO anon 
USING (EXISTS(
  SELECT 1 FROM productos pr 
  JOIN projects p ON pr.project_id = p.id 
  WHERE pr.id = producto_id AND p.share_token IS NOT NULL
));

-- ELEMENT_CHECKS
DROP POLICY IF EXISTS "Lectura Element Checks Inmune" ON element_checks;
CREATE POLICY "Lectura Element Checks Inmune" ON element_checks FOR SELECT TO authenticated
USING (EXISTS(
  SELECT 1 FROM activities a 
  JOIN items i ON a.item_id = i.id 
  JOIN partidas pa ON i.partida_id = pa.id 
  JOIN projects p ON pa.project_id = p.id 
  WHERE a.id = activity_id AND (p.owner_id = auth.uid() OR public.soy_miembro_del_proyecto(p.id))
));

DROP POLICY IF EXISTS "Gestion Dueño Element Checks" ON element_checks;
CREATE POLICY "Gestion Dueño Element Checks" ON element_checks FOR ALL TO authenticated
USING (EXISTS(
  SELECT 1 FROM activities a 
  JOIN items i ON a.item_id = i.id 
  JOIN partidas pa ON i.partida_id = pa.id 
  JOIN projects p ON pa.project_id = p.id 
  WHERE a.id = activity_id AND p.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "Anon Leer Element Checks" ON element_checks;
CREATE POLICY "Anon Leer Element Checks" ON element_checks FOR SELECT TO anon 
USING (EXISTS(
  SELECT 1 FROM activities a 
  JOIN items i ON a.item_id = i.id 
  JOIN partidas pa ON i.partida_id = pa.id 
  JOIN projects p ON pa.project_id = p.id 
  WHERE a.id = activity_id AND p.share_token IS NOT NULL
));
