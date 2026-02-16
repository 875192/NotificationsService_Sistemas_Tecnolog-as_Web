-- ============================================================
--  NotificationsService - Schema inicial (PostgreSQL)
--  Tablas: alertas, notificaciones
--  Tipos enum: tipo_alerta, severidad_alerta, estado_alerta, estado_notificacion
--  Campos de fecha renombrados:
--    - alertas: fecha_creacion_alerta, fecha_actualizacion_alerta
--    - notificaciones: fecha_creacion_notificacion, fecha_actualizacion_notificacion
-- ============================================================

-- Necesario para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- ENUMS (si prefieres crear a pelo sin DO, puedes quitar idempotencia)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alerta') THEN
    CREATE TYPE tipo_alerta AS ENUM (
      'VEHICULO_SIN_BATERIA',
      'RESERVA_EXPIRADA',
      'POSTE_AVERIADO'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severidad_alerta') THEN
    CREATE TYPE severidad_alerta AS ENUM ('INFO', 'WARNING', 'CRITICAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_alerta') THEN
    CREATE TYPE estado_alerta AS ENUM ('ACTIVA', 'CERRADA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_notificacion') THEN
    CREATE TYPE estado_notificacion AS ENUM ('PENDIENTE', 'ACK', 'RESUELTA');
  END IF;
END$$;

-- ------------------------------------------------------------
-- TABLA: alertas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alertas (
  id_alerta UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tipo       tipo_alerta       NOT NULL,
  severidad  severidad_alerta  NOT NULL,
  estado     estado_alerta     NOT NULL DEFAULT 'ACTIVA',

  id_entidad TEXT              NOT NULL,

  fecha_creacion_alerta      TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion_alerta TIMESTAMPTZ NOT NULL DEFAULT now(),

  contexto JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ------------------------------------------------------------
-- TABLA: notificaciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  id_alerta    UUID NOT NULL REFERENCES alertas(id_alerta) ON DELETE CASCADE,
  id_conductor TEXT NOT NULL,

  estado  estado_notificacion NOT NULL DEFAULT 'PENDIENTE',
  mensaje TEXT NOT NULL,

  dedup_key TEXT NOT NULL,

  fecha_creacion_notificacion      TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion_notificacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- ÍNDICES "normales" (rendimiento)
-- ------------------------------------------------------------

-- Buscar notificaciones por conductor
CREATE INDEX IF NOT EXISTS idx_notif_conductor
  ON notificaciones (id_conductor);

-- Filtrar por conductor + estado (típico en UI)
CREATE INDEX IF NOT EXISTS idx_notif_conductor_estado
  ON notificaciones (id_conductor, estado);

-- Filtrar alertas por estado (ACTIVA/CERRADA)
CREATE INDEX IF NOT EXISTS idx_alertas_estado
  ON alertas (estado);

-- Buscar alertas por tipo+entidad+estado (común en findAlertaActivaByTipoEntidad)
CREATE INDEX IF NOT EXISTS idx_alertas_tipo_entidad_estado
  ON alertas (tipo, id_entidad, estado);

-- ------------------------------------------------------------
-- ÍNDICES ÚNICOS PARCIALES (tu lógica de deduplicación)
-- ------------------------------------------------------------

-- 1) Solo puede existir UNA alerta ACTIVA por (tipo, id_entidad)
CREATE UNIQUE INDEX IF NOT EXISTS uq_alerta_activa_tipo_entidad
  ON alertas (tipo, id_entidad)
  WHERE estado = 'ACTIVA';

-- 2) Solo puede existir UNA notificación PENDIENTE por dedup_key
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_pendiente_dedup
  ON notificaciones (dedup_key)
  WHERE estado = 'PENDIENTE';
