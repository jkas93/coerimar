-- Migración para actualizar la tabla projects con las nuevas categorías de aparejos

ALTER TABLE public.projects 
  DROP COLUMN IF EXISTS cant_aparejos_reparar,
  DROP COLUMN IF EXISTS codigos_aparejos;

ALTER TABLE public.projects
  ADD COLUMN cant_poleas_cambiar integer DEFAULT 0,
  ADD COLUMN codigos_poleas text DEFAULT '',
  ADD COLUMN cant_cascos_cambiar integer DEFAULT 0,
  ADD COLUMN codigos_cascos text DEFAULT '';
