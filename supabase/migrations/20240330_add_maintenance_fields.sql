-- Migration: Add maintenance process fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS cliente TEXT,
ADD COLUMN IF NOT EXISTS embarcacion TEXT,
ADD COLUMN IF NOT EXISTS orden_compra TEXT,
ADD COLUMN IF NOT EXISTS fecha_ingreso DATE,
ADD COLUMN IF NOT EXISTS cant_aparejos_reparar INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cant_aparejos_irreparables INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS codigos_aparejos TEXT,
ADD COLUMN IF NOT EXISTS cant_rodamientos_cambiar INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS codigos_rodamientos TEXT,
ADD COLUMN IF NOT EXISTS cant_cancamos_cambiar INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS codigos_cancamos TEXT,
ADD COLUMN IF NOT EXISTS cant_pines_cambiar INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS codigos_pines TEXT;
