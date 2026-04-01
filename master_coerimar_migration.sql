-- ==============================================================================
-- 🚀 MIGRACIÓN MAESTRA COERIMAR
-- Instrucciones: Pega todo este código en tu SQL Editor de la base correcta
-- y aprieta "Run". No va a fallar y preparará todo tu sistema para Mantenimiento.
-- ==============================================================================

-- ==============================================================================
-- FASE 1: ACTUALIZACIÓN DE ESTRUCTURA "APAREJOS A REPARAR"
-- ==============================================================================
-- Eliminamos los campos obsoletos y generalizados
ALTER TABLE public.projects 
  DROP COLUMN IF EXISTS cant_aparejos_reparar,
  DROP COLUMN IF EXISTS codigos_aparejos;

-- Añadimos los tipos de repuestos específicos de forma limpia
ALTER TABLE public.projects
  ADD COLUMN cant_poleas_cambiar integer DEFAULT 0,
  ADD COLUMN codigos_poleas text DEFAULT '',
  ADD COLUMN cant_cascos_cambiar integer DEFAULT 0,
  ADD COLUMN codigos_cascos text DEFAULT '';


-- ==============================================================================
-- FASE 2: INSTALACIÓN DEL "MODO DIOS" (SUPERADMIN)
-- ==============================================================================

-- 1. Asegurar la existencia de la columna "is_superadmin" en todos los usuarios
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

-- 2. Demos el poder absoluto a Kevin Avalos (Usamos el enlace seguro con auth.users)
UPDATE public.profiles p
SET is_superadmin = true
FROM auth.users u
WHERE p.id = u.id AND u.email = 'javaloss@uni.pe';

-- 3. Crear función de validación rápida y definitiva para RLS
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()), 
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Inyectar llave maestra a todos los portones de seguridad sin romper si algo falta
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    DROP POLICY IF EXISTS "God mode para projects" ON public.projects;
    CREATE POLICY "God mode para projects" ON public.projects FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'partidas') THEN
    DROP POLICY IF EXISTS "God mode para partidas" ON public.partidas;
    CREATE POLICY "God mode para partidas" ON public.partidas FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'items') THEN
    DROP POLICY IF EXISTS "God mode para items" ON public.items;
    CREATE POLICY "God mode para items" ON public.items FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activities') THEN
    DROP POLICY IF EXISTS "God mode para activities" ON public.activities;
    CREATE POLICY "God mode para activities" ON public.activities FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_progress') THEN
    DROP POLICY IF EXISTS "God mode para daily_progress" ON public.daily_progress;
    CREATE POLICY "God mode para daily_progress" ON public.daily_progress FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_members') THEN
    DROP POLICY IF EXISTS "God mode para project_members" ON public.project_members;
    CREATE POLICY "God mode para project_members" ON public.project_members FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;


-- ==============================================================================
-- FASE 3: REINICIAR MEMORIA CACHÉ PÚBLICA (PARA REFLEJAR TODOS LOS CAMBIOS HOY MISMO)
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
