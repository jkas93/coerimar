// =============================================================
// TypeScript type definitions for the COERIMAR database
// =============================================================

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  owner_id: string;
  share_token: string;
  created_at: string;
  updated_at: string;
  // Maintenance fields
  cliente?: string;
  embarcacion?: string;
  orden_compra?: string;
  fecha_ingreso?: string;
  cant_productos?: number;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

export interface Partida {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Item {
  id: string;
  partida_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Activity {
  id: string;
  item_id: string;
  name: string;
  start_date: string;
  end_date: string;
  weight: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailyProgress {
  id: string;
  activity_id: string;
  date: string;
  progress_percent: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  has_restriction?: boolean;
  restriction_reason?: string | null;
  photo_urls?: string[] | null;
}

export interface Alert {
  id: string;
  project_id: string;
  activity_id: string | null;
  type: 'schedule_delay' | 'progress_deviation';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  created_at: string;
}

// =============================================================
// Extended types (with joined data)
// =============================================================

export interface ActivityWithProgress extends Activity {
  daily_progress: DailyProgress[];
}

export interface ItemWithActivities extends Item {
  activities: Activity[];
}

export interface PartidaWithItems extends Partida {
  items: ItemWithActivities[];
}

export interface ProjectWithDetails extends Project {
  partidas: PartidaWithItems[];
  owner: Profile;
}

// =============================================================
// S-Curve types
// =============================================================

export interface SCurvePoint {
  date: string;
  planned: number;     // Cumulative planned progress 0–100
  actual?: number;      // Cumulative actual progress 0–100
  deviation: number;   // Difference (actual - planned)
}

export interface SCurveData {
  points: SCurvePoint[];
  totalWeight: number;
  currentPlanned: number;
  currentActual: number;
  spiIndex: number;    // Schedule Performance Index
  latestProgressDate?: string | null;
}

// =============================================================
// Gantt chart types (for dhtmlx-gantt integration)
// =============================================================

export interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  end_date: string;
  duration?: number;
  parent: string;
  type?: 'project' | 'task';
  weight?: number;
  progress?: number;
  open?: boolean;
  // Custom fields
  db_type?: 'partida' | 'item' | 'activity';
  db_id?: string;
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: string;
}

// =============================================================
// Product and Element System Types (P.U.L.S.O.)
// =============================================================

export const ELEMENT_TYPES = ['rodamientos', 'cancamos', 'pines', 'poleas', 'cascos'] as const;
export type ElementType = typeof ELEMENT_TYPES[number];

export const ELEMENT_LABELS: Record<ElementType, string> = {
  rodamientos: 'Rodamientos',
  cancamos: 'Cáncamos',
  pines: 'Pines',
  poleas: 'Poleas',
  cascos: 'Cascos',
};

export const MAINTENANCE_STAGES = [
  'ETAPA DE MANTENIMIENTO',
  'INSPECCION VISUAL INICIAL',
  'DESMONTAJE DE APAREJOS',
  'ARENADO DE APAREJOS',
  'BASE EPOXICA INICIAL',
  'SOLDADO DE POLEAS',
  'MECANIZADO DE POLEAS',
  'BASE EPOXICA DE POLEAS',
  'SOLDADO DE CASCOS',
  'ESMERILADO DE CASCOS',
  'BASE EPOXICA DE CASCOS',
  'MECANIZADO O CAMBIO DE PINES',
  'CONTROL DE CALIDAD DE COMPONENTES',
  'ENSAMBLE DE APAREJOS DE IZAJE',
  'PINTURA Y PROTECCIÓN DE APAREJO',
  'EMBALADO DE APAREJOS',
  'PRODUCTO TERMINADO',
] as const;

export const STAGE_ELEMENT_MAP: Record<string, ElementType[] | null> = {
  'SOLDADO DE POLEAS': ['poleas'],
  'MECANIZADO DE POLEAS': ['poleas'],
  'BASE EPOXICA DE POLEAS': ['poleas'],
  'SOLDADO DE CASCOS': ['cascos'],
  'ESMERILADO DE CASCOS': ['cascos'],
  'BASE EPOXICA DE CASCOS': ['cascos'],
  'MECANIZADO O CAMBIO DE PINES': ['pines'],
};

export interface Producto {
  id: string;
  project_id: string;
  codigo_unico: string;
  sort_order: number;
  created_at: string;
}

export interface ProductElement {
  id: string;
  producto_id: string;
  element_type: ElementType;
  codigo_unico: string;
  sort_order: number;
  created_at: string;
}

export interface ElementCheck {
  id: string;
  activity_id: string;
  product_element_id: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}
