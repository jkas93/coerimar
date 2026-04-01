-- =============================================================
-- SCRIPT DE CONFIGURACIÓN P.U.L.S.O. - MODO DIOS (SUPERADMIN)
-- RUN THIS IN SUPABASE SQL EDITOR
-- =============================================================

-- 1. Agregar columna is_superadmin a profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

-- Opcional: Para probarlo inmediatamente contigo mismo, puedes descomentar la siguiente línea
-- reemplazando con tu email real para volverte Superadmin enseguida:
-- UPDATE public.profiles SET is_superadmin = true WHERE email = 'tu@correo.com';

-- 2. Crear función de validación súper rápida para RLS (usada internamente por la BD)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()), 
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Inyectar Políticas Modo Dios en todas las tablas transaccionales
-- Esto garantiza que no importa si existe una regla anterior restrictiva,
-- el motor de Supabase dirá "Déjalo pasar, es Superadmin".

-- Para projects
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    DROP POLICY IF EXISTS "God mode para projects" ON public.projects;
    CREATE POLICY "God mode para projects" ON public.projects FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

-- Para partidas
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'partidas') THEN
    DROP POLICY IF EXISTS "God mode para partidas" ON public.partidas;
    CREATE POLICY "God mode para partidas" ON public.partidas FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

-- Para items
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'items') THEN
    DROP POLICY IF EXISTS "God mode para items" ON public.items;
    CREATE POLICY "God mode para items" ON public.items FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

-- Para activities
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activities') THEN
    DROP POLICY IF EXISTS "God mode para activities" ON public.activities;
    CREATE POLICY "God mode para activities" ON public.activities FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

-- Para daily_progress
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_progress') THEN
    DROP POLICY IF EXISTS "God mode para daily_progress" ON public.daily_progress;
    CREATE POLICY "God mode para daily_progress" ON public.daily_progress FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

-- Para project_members
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_members') THEN
    DROP POLICY IF EXISTS "God mode para project_members" ON public.project_members;
    CREATE POLICY "God mode para project_members" ON public.project_members FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

-- Para project_milestones
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_milestones') THEN
    DROP POLICY IF EXISTS "God mode para project_milestones" ON public.project_milestones;
    CREATE POLICY "God mode para project_milestones" ON public.project_milestones FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;

-- Para alerts
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alerts') THEN
    DROP POLICY IF EXISTS "God mode para alerts" ON public.alerts;
    CREATE POLICY "God mode para alerts" ON public.alerts FOR ALL TO authenticated USING (public.is_superadmin());
  END IF;
END $$;
