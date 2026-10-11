export interface Student {
  codigo: string;
  nombre: string;
  anio: string;
  especialidad: string;
  seccion: string;
  correo: string;
  estado: 'ACTIVO' | 'INACTIVO';
  fotoUrl: string;
  creado: string;
}

export interface AttendanceRecord {
  id: string;
  fechaHora: string;
  hora?: string;
  fecha?: string;
  codigo: string;
  nombre: string;
  anio: string;
  especialidad: string;
  seccion: string;
  resultado: 'ENTRADA_EXITOSA' | 'DUPLICADO' | 'CODIGO_DESCONOCIDO_O_INACTIVO';
  origen: string;
}

export interface SystemSettings {
  nombreInstituto: string;
  lemaInstituto: string;
  colorPrincipal: string;
  colorFondo: string;
  deviceKey: string;
  hookSecret: string;
  botToken: string;
  adminIds: string;
  duplicadoVentanaSegundos: number;
}

export type ActiveTab = 'kiosk' | 'students' | 'attendance' | 'carnets' | 'hardware' | 'bot' | 'guide';
