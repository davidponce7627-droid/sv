import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_FILE = path.join(process.cwd(), 'school_database.json');

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Types
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

// Timezone: America/El_Salvador (UTC-6)
export const TZ_EL_SALVADOR = 'America/El_Salvador';

export function formatElSalvadorDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_EL_SALVADOR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatElSalvadorTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: TZ_EL_SALVADOR,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatElSalvadorTime24(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: TZ_EL_SALVADOR,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

// Initial default data
const defaultSettings: SystemSettings = {
  nombreInstituto: 'INSTITUTO NACIONAL TÉCNICO INDUSTRIAL',
  lemaInstituto: 'Ciencia, Tecnología y Futuro',
  colorPrincipal: '#1E40AF', // Deep blue
  colorFondo: '#F0F9FF',
  deviceKey: 'ARDUINO_SECRET_KEY_2026',
  hookSecret: 'TELEGRAM_HOOK_SECRET_XYZ',
  botToken: '',
  adminIds: '',
  duplicadoVentanaSegundos: 60,
};

const defaultStudents: Student[] = [];

// Helper to persist database
function loadDatabase(): {
  students: Student[];
  attendances: AttendanceRecord[];
  settings: SystemSettings;
} {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        students: parsed.students || defaultStudents,
        attendances: parsed.attendances || [],
        settings: { ...defaultSettings, ...(parsed.settings || {}) },
      };
    }
  } catch (err) {
    console.error('Error loading database file, using defaults:', err);
  }
  return {
    students: defaultStudents,
    attendances: [],
    settings: defaultSettings,
  };
}

let db = loadDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// In-memory SSE clients for real-time live attendance notifications
const sseClients: Response[] = [];

function broadcastEvent(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Async Telegram notifier
async function notifyTelegram(message: string) {
  const token = db.settings.botToken;
  const adminIds = db.settings.adminIds.split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !adminIds.length) return;

  for (const chatId of adminIds) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
    } catch (e) {
      console.error(`Error sending Telegram alert to ${chatId}:`, e);
    }
  }
}

// Core scan handler shared by /api/scan and /exec?action=scan
function processScan(code: string, key?: string, origin = 'ESP-01') {
  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanKey = String(key || '').trim();

  // Validate security key if configured
  if (db.settings.deviceKey && cleanKey !== db.settings.deviceKey) {
    return {
      statusHttp: 401,
      response: { ok: false, status: 'UNAUTHORIZED', message: 'Clave de dispositivo inválida' },
    };
  }

  if (!cleanCode) {
    return {
      statusHttp: 400,
      response: { ok: false, status: 'INVALID_CODE', message: 'Código vacío' },
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const nowTimeStr = formatElSalvadorTime(now);
  const nowTime24 = formatElSalvadorTime24(now);
  const nowDateStr = formatElSalvadorDate(now);

  // Anti-rebound duplicate check within window
  const windowMs = (db.settings.duplicadoVentanaSegundos || 60) * 1000;
  const isDuplicate = db.attendances.some((att) => {
    if (att.codigo.toUpperCase() === cleanCode && att.resultado === 'ENTRADA_EXITOSA') {
      const attTime = new Date(att.fechaHora).getTime();
      return Math.abs(now.getTime() - attTime) <= windowMs;
    }
    return false;
  });

  if (isDuplicate) {
    const student = db.students.find((s) => s.codigo.toUpperCase() === cleanCode);
    const dupRecord: AttendanceRecord = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      fechaHora: nowIso,
      hora: nowTimeStr,
      fecha: nowDateStr,
      codigo: cleanCode,
      nombre: student ? student.nombre : 'Desconocido',
      anio: student ? student.anio : '',
      especialidad: student ? student.especialidad : '',
      seccion: student ? student.seccion : '',
      resultado: 'DUPLICADO',
      origen: origin,
    };
    db.attendances.unshift(dupRecord);
    saveDatabase();

    broadcastEvent('scan_result', {
      status: 'DUPLICATE',
      code: cleanCode,
      student,
      record: dupRecord,
      horaElSalvador: nowTimeStr,
      hora24: nowTime24,
      fechaElSalvador: nowDateStr,
      time: nowTimeStr,
      message: 'Escaneo repetido en menos de 60 segundos; no se duplicó la entrada.',
    });

    return {
      statusHttp: 200,
      response: {
        ok: true,
        status: 'DUPLICATE',
        code: cleanCode,
        time: nowTimeStr,
        horaElSalvador: nowTimeStr,
        hora24: nowTime24,
        fechaElSalvador: nowDateStr,
        zonaHoraria: 'America/El_Salvador (UTC-6)',
        message: 'Escaneo repetido; no se duplicó el registro.',
      },
    };
  }

  // Check if student exists and is active
  const student = db.students.find((s) => s.codigo.toUpperCase() === cleanCode);
  const isActive = student && (student.estado === 'ACTIVO' || (student.estado as any) === 'ACTIVE');

  if (!student || !isActive) {
    const unknownRecord: AttendanceRecord = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      fechaHora: nowIso,
      hora: nowTimeStr,
      fecha: nowDateStr,
      codigo: cleanCode,
      nombre: student ? student.nombre : 'NO REGISTRADO',
      anio: student ? student.anio : '',
      especialidad: student ? student.especialidad : '',
      seccion: student ? student.seccion : '',
      resultado: 'CODIGO_DESCONOCIDO_O_INACTIVO',
      origen: origin,
    };
    db.attendances.unshift(unknownRecord);
    saveDatabase();

    const alertMsg = `⚠️ ALERTA ASISTENCIA [🇸🇻 El Salvador]\nCódigo: ${cleanCode} (${student ? 'Inactivo en sistema' : 'No registrado'})\nHora: ${nowTimeStr} (Hora El Salvador, UTC-6)\nFecha: ${nowDateStr}\nOrigen: ${origin}`;
    notifyTelegram(alertMsg);

    broadcastEvent('scan_result', {
      status: 'UNKNOWN_CODE',
      code: cleanCode,
      student: null,
      record: unknownRecord,
      horaElSalvador: nowTimeStr,
      hora24: nowTime24,
      fechaElSalvador: nowDateStr,
      time: nowTimeStr,
      message: student
        ? 'Estudiante encontrado pero se encuentra INACTIVO en el sistema.'
        : 'Código de barra NO registrado. Permite registrar al estudiante ahora.',
    });

    return {
      statusHttp: 200,
      response: {
        ok: false,
        status: 'UNKNOWN_CODE',
        code: cleanCode,
        isUnregistered: !student,
        time: nowTimeStr,
        horaElSalvador: nowTimeStr,
        hora24: nowTime24,
        fechaElSalvador: nowDateStr,
        zonaHoraria: 'America/El_Salvador (UTC-6)',
        message: student
          ? 'Estudiante inactivo en el sistema.'
          : 'Código no registrado; regístralo desde el panel web.',
      },
    };
  }

  // Success recording
  const validRecord: AttendanceRecord = {
    id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    fechaHora: nowIso,
    hora: nowTimeStr,
    fecha: nowDateStr,
    codigo: student.codigo,
    nombre: student.nombre,
    anio: student.anio,
    especialidad: student.especialidad,
    seccion: student.seccion,
    resultado: 'ENTRADA_EXITOSA',
    origen: origin,
  };
  db.attendances.unshift(validRecord);
  saveDatabase();

  const successMsg = `✅ ASISTENCIA REGISTRADA [🇸🇻 El Salvador]\nNombre: ${student.nombre}\nCódigo: ${student.codigo}\nAño: ${student.anio} ${student.especialidad} (${student.seccion})\nHora: ${nowTimeStr} (Hora El Salvador, UTC-6)\nFecha: ${nowDateStr}`;
  notifyTelegram(successMsg);

  broadcastEvent('scan_result', {
    status: 'RECORDED',
    code: cleanCode,
    student,
    record: validRecord,
    horaElSalvador: nowTimeStr,
    hora24: nowTime24,
    fechaElSalvador: nowDateStr,
    time: nowTimeStr,
    message: '¡Asistencia registrada exitosamente!',
  });

  return {
    statusHttp: 200,
    response: {
      ok: true,
      status: 'RECORDED',
      code: cleanCode,
      name: student.nombre,
      student,
      time: nowTimeStr,
      horaElSalvador: nowTimeStr,
      hora24: nowTime24,
      fechaElSalvador: nowDateStr,
      zonaHoraria: 'America/El_Salvador (UTC-6)',
      message: 'Asistencia registrada correctamente.',
    },
  };
}

// Server Sent Events for live instant web updates
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// REST Endpoint: /api/scan
app.all('/api/scan', (req: Request, res: Response) => {
  const code = (req.query.code as string) || req.body?.code;
  const key = (req.query.key as string) || req.body?.key;
  const origin = (req.query.origin as string) || req.body?.origin || 'Arduino-ESP01';

  const result = processScan(code, key, origin);
  return res.status(result.statusHttp).json(result.response);
});

// Google Apps Script Compatibility Endpoint: /exec
// Supports ?action=health and ?action=scan&code=XYZ&key=KEY
app.get('/exec', (req: Request, res: Response) => {
  const action = req.query.action as string;
  if (action === 'health') {
    return res.json({
      ok: true,
      service: 'Control Estudiantil Arduino Uno',
      timezone: 'America/El_Salvador (UTC-6)',
      horaElSalvador: formatElSalvadorTime(),
      hora24ElSalvador: formatElSalvadorTime24(),
      fechaElSalvador: formatElSalvadorDate(),
      time: new Date().toISOString(),
      studentsCount: db.students.length,
      attendanceCount: db.attendances.length,
    });
  }

  if (action === 'scan') {
    const code = req.query.code as string;
    const key = req.query.key as string;
    const origin = (req.query.origin as string) || 'ESP-01';
    const result = processScan(code, key, origin);
    return res.status(result.statusHttp).json(result.response);
  }

  return res.json({
    ok: true,
    message: 'Servicio activo. Usa action=health o action=scan.',
  });
});

// Dedicated time endpoint for hardware and web clients
app.get('/api/time', (_req: Request, res: Response) => {
  const now = new Date();
  res.json({
    ok: true,
    country: 'El Salvador',
    timezone: TZ_EL_SALVADOR,
    utcOffset: '-06:00',
    hora: formatElSalvadorTime(now),
    hora24: formatElSalvadorTime24(),
    fecha: formatElSalvadorDate(now),
    iso: now.toISOString(),
  });
});

// Students API
app.get('/api/students', (_req: Request, res: Response) => {
  res.json({ ok: true, students: db.students });
});

app.post('/api/students', (req: Request, res: Response) => {
  const { codigo, nombre, anio, especialidad, seccion, correo, estado, fotoUrl } = req.body;
  if (!codigo || !nombre) {
    return res.status(400).json({ ok: false, message: 'Código y Nombre son requeridos.' });
  }

  const cleanCode = String(codigo).trim().toUpperCase();
  const existingIndex = db.students.findIndex((s) => s.codigo.toUpperCase() === cleanCode);

  const studentData: Student = {
    codigo: cleanCode,
    nombre: String(nombre).trim(),
    anio: anio || '1°',
    especialidad: especialidad || 'General',
    seccion: seccion || 'A',
    correo: correo || '',
    estado: estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
    fotoUrl: fotoUrl || '',
    creado: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    db.students[existingIndex] = { ...db.students[existingIndex], ...studentData };
  } else {
    db.students.unshift(studentData);
  }
  saveDatabase();

  broadcastEvent('students_updated', { students: db.students });
  return res.json({ ok: true, student: studentData });
});

app.put('/api/students/:codigo', (req: Request, res: Response) => {
  const targetCode = req.params.codigo.toUpperCase();
  const idx = db.students.findIndex((s) => s.codigo.toUpperCase() === targetCode);
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: 'Estudiante no encontrado.' });
  }

  db.students[idx] = {
    ...db.students[idx],
    ...req.body,
    codigo: targetCode,
  };
  saveDatabase();

  broadcastEvent('students_updated', { students: db.students });
  return res.json({ ok: true, student: db.students[idx] });
});

app.delete('/api/students/:codigo', (req: Request, res: Response) => {
  const targetCode = req.params.codigo.toUpperCase();
  const idx = db.students.findIndex((s) => s.codigo.toUpperCase() === targetCode);
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: 'Estudiante no encontrado.' });
  }

  const removed = db.students.splice(idx, 1)[0];
  saveDatabase();

  broadcastEvent('students_updated', { students: db.students });
  return res.json({ ok: true, student: removed });
});

// Attendances API
app.get('/api/attendance', (req: Request, res: Response) => {
  const dateFilter = req.query.date as string;
  let list = db.attendances;

  if (dateFilter) {
    list = list.filter((a) => formatElSalvadorDate(new Date(a.fechaHora)) === dateFilter);
  }

  res.json({ ok: true, attendances: list });
});

app.delete('/api/attendance/clear', (_req: Request, res: Response) => {
  db.attendances = [];
  saveDatabase();
  broadcastEvent('attendance_cleared', {});
  res.json({ ok: true, message: 'Historial de asistencias borrado.' });
});

// Settings API
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ ok: true, settings: db.settings });
});

app.post('/api/settings', (req: Request, res: Response) => {
  db.settings = { ...db.settings, ...req.body };
  saveDatabase();
  broadcastEvent('settings_updated', { settings: db.settings });
  res.json({ ok: true, settings: db.settings });
});

// Auth Verification Endpoint: verify admin ID to unlock dashboard
app.post('/api/auth/verify', (req: Request, res: Response) => {
  const { adminId } = req.body;
  const configuredIds = (db.settings.adminIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // If no admin ID is configured in the database yet, any first setup is allowed
  if (configuredIds.length === 0) {
    return res.json({
      ok: true,
      needsSetup: true,
      message: 'Configuración inicial requerida: define tu Admin ID y Bot Token.',
    });
  }

  const cleanInput = String(adminId || '').trim();
  const isMatch = configuredIds.includes(cleanInput);

  if (isMatch) {
    return res.json({
      ok: true,
      needsSetup: false,
      message: 'Acceso de Administrador concedido.',
    });
  }

  return res.status(401).json({
    ok: false,
    needsSetup: false,
    message: 'Admin ID incorrecto. Verifica tu Telegram ID o clave de administrador.',
  });
});

// Test Telegram Bot Token in real time using Telegram getMe API
app.post('/api/bot/test-token', async (req: Request, res: Response) => {
  const { token } = req.body;
  const targetToken = String(token || db.settings.botToken || '').trim();

  if (!targetToken) {
    return res.status(400).json({ ok: false, error: 'Token de Bot no especificado.' });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${targetToken}/getMe`);
    const data = await tgRes.json();
    if (data.ok && data.result) {
      return res.json({
        ok: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          first_name: data.result.first_name,
        },
      });
    } else {
      return res.json({
        ok: false,
        error: data.description || 'Token inválido devuelto por Telegram.',
      });
    }
  } catch (err: any) {
    return res.json({
      ok: false,
      error: `Error al contactar api.telegram.org: ${err.message}`,
    });
  }
});

// Super Admin Telegram Command Processor (shared by simulator and real webhook)
function processBotCommand(rawText: string, fromId?: string): { reply: string; student?: Student } {
  const text = String(rawText || '').trim();

  // Admin authorization check (if adminIds configured and fromId provided)
  if (fromId && db.settings.adminIds) {
    const authorized = db.settings.adminIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (authorized.length > 0 && !authorized.includes(String(fromId))) {
      return { reply: `⛔ No estás autorizado para administrar este sistema. Tu ID de Telegram es: ${fromId}` };
    }
  }

  if (!text) {
    return { reply: 'Escribe un comando como /start, /hoy, /carnet CODIGO, /alta...' };
  }

  if (['/start', '/menu', '🏠 Panel principal'].includes(text)) {
    return {
      reply: `🏫 SISTEMA DE ASISTENCIA ARDUINO — PANEL ADMINISTRADOR\n\nComandos de Gestión Total:\n• /alta CODIGO|NOMBRE|AÑO|ESPECIALIDAD|SECCION|CORREO — Registrar alumno\n• /baja CODIGO — Desactivar alumno\n• /activar CODIGO — Habilitar alumno\n• /eliminar CODIGO — Borrar alumno\n• /buscar TEXTO — Buscar estudiante\n• /carnet CODIGO — Datos de credencial\n• /carnets TODOS (o por año: /carnets 3°) — Lista de carnets\n• /hoy — Asistencias registradas hoy\n• /reporte — Resumen diario\n• /limpiar — Borrar historial de asistencias\n• /reiniciar — Dejar la base de datos en cero\n• /estado — Conexión y clave Arduino`,
    };
  }

  if (text === '/ayuda') {
    return {
      reply: `📖 GUÍA DE COMANDOS DEL BOT (SUPER ADMIN):\n\n1. Dar de alta estudiante:\n/alta EST0001|Ana Pérez|3°|Software|A|ana@escuela.edu\n\n2. Consultas:\n/buscar Ana\n/carnet EST0001\n/carnets TODOS\n/hoy\n\n3. Modificar estado:\n/baja EST0001\n/activar EST0001\n/eliminar EST0001\n\n4. Sistema:\n/estado\n/limpiar\n/reiniciar`,
    };
  }

  if (text === '/estado') {
    const today = formatElSalvadorDate();
    const todayCount = db.attendances.filter(
      (a) => formatElSalvadorDate(new Date(a.fechaHora)) === today && a.resultado === 'ENTRADA_EXITOSA'
    ).length;
    return {
      reply: `✅ ESTADO DEL SERVIDOR\nInstitución: ${db.settings.nombreInstituto}\nEstudiantes en el padrón: ${db.students.length}\nAsistencias hoy (${today}): ${todayCount}\nClave Arduino (DEVICE_KEY): ${db.settings.deviceKey ? 'Protegida' : 'Abierta'}\nHora El Salvador: ${formatElSalvadorTime()}`,
    };
  }

  if (text === '/hoy') {
    const today = formatElSalvadorDate();
    const todayRecords = db.attendances.filter((a) => formatElSalvadorDate(new Date(a.fechaHora)) === today);
    const valid = todayRecords.filter((a) => a.resultado === 'ENTRADA_EXITOSA');
    let msg = `📋 ASISTENCIAS DE HOY [El Salvador] (${today})\nEntradas válidas: ${valid.length}\nEscaneos totales: ${todayRecords.length}\n\n`;
    if (!valid.length) {
      msg += 'No hay entradas válidas registradas hoy aún.';
    } else {
      valid.slice(0, 20).forEach((r) => {
        const time = formatElSalvadorTime(new Date(r.fechaHora));
        msg += `${time} — ${r.nombre} (${r.codigo}) [${r.anio} ${r.especialidad}]\n`;
      });
      if (valid.length > 20) {
        msg += `\n... y ${valid.length - 20} estudiantes más.`;
      }
    }
    return { reply: msg };
  }

  if (text === '/reporte') {
    const today = formatElSalvadorDate();
    const todayRecords = db.attendances.filter((a) => formatElSalvadorDate(new Date(a.fechaHora)) === today);
    const valid = todayRecords.filter((a) => a.resultado === 'ENTRADA_EXITOSA');
    return {
      reply: `📊 REPORTE DE HOY [El Salvador] (${today})\n• Total estudiantes registrados: ${db.students.length}\n• Asistencias válidas: ${valid.length}\n• Duplicados evitados: ${todayRecords.filter((a) => a.resultado === 'DUPLICADO').length}\n• Incidencias/desconocidos: ${todayRecords.filter((a) => a.resultado === 'CODIGO_DESCONOCIDO_O_INACTIVO').length}\n\nPuedes descargar el reporte CSV completo en la web en la pestaña "Asistencias".`,
    };
  }

  if (text === '/limpiar') {
    db.attendances = [];
    saveDatabase();
    broadcastEvent('attendance_cleared', {});
    return { reply: '🧹 Historial de asistencias borrado con éxito.' };
  }

  if (text === '/reiniciar') {
    db.students = [];
    db.attendances = [];
    saveDatabase();
    broadcastEvent('students_updated', { students: [] });
    broadcastEvent('attendance_cleared', {});
    return { reply: '🔄 Base de datos restablecida a CERO registros (0 estudiantes, 0 asistencias).' };
  }

  if (text.startsWith('/buscar ')) {
    const q = text.substring(8).trim().toLowerCase();
    const found = db.students.filter(
      (s) => s.codigo.toLowerCase().includes(q) || s.nombre.toLowerCase().includes(q)
    );
    if (!found.length) {
      return { reply: `🔎 No se encontraron estudiantes con: "${q}"` };
    }
    let msg = `🔎 RESULTADOS (${found.length}):\n\n`;
    found.slice(0, 5).forEach((s) => {
      msg += `• ${s.codigo} - ${s.nombre}\n  Año: ${s.anio} | Esp: ${s.especialidad} | Sec: ${s.seccion}\n  Estado: ${s.estado}\n\n`;
    });
    return { reply: msg.trim() };
  }

  if (text.startsWith('/carnet ')) {
    const code = text.substring(8).trim().toUpperCase();
    const student = db.students.find((s) => s.codigo.toUpperCase() === code);
    if (!student) {
      return { reply: `❌ Estudiante con código "${code}" no encontrado.` };
    }
    return {
      student,
      reply: `🪪 CARNET DE ESTUDIANTE\n\nCódigo: ${student.codigo}\nNombre: ${student.nombre}\nAño: ${student.anio}\nEspecialidad: ${student.especialidad}\nSección: ${student.seccion}\nEstado: ${student.estado}\n\n(Puedes imprimir su carnet vertical con código de barras en la pestaña "Diseño de Carnets" de la web).`,
    };
  }

  if (text.startsWith('/carnets')) {
    const yr = text.substring(8).trim();
    const list = db.students.filter(
      (s) => s.estado === 'ACTIVO' && (!yr || yr.toUpperCase() === 'TODOS' || s.anio.toUpperCase() === yr.toUpperCase())
    );
    if (!list.length) {
      return { reply: 'No se encontraron estudiantes activos para ese criterio.' };
    }
    let msg = `🪪 CARNETS DISPONIBLES (${list.length}):\n\n`;
    list.slice(0, 15).forEach((s) => {
      msg += `• ${s.codigo} — ${s.nombre} (${s.anio} "${s.seccion}")\n`;
    });
    if (list.length > 15) {
      msg += `\n... y ${list.length - 15} estudiantes más.`;
    }
    return { reply: msg };
  }

  if (text.startsWith('/alta ')) {
    const raw = text.substring(6).trim();
    const parts = raw.split('|').map((s) => s.trim());
    if (parts.length < 2) {
      return {
        reply: 'Formato requerido:\n/alta CODIGO|NOMBRE|AÑO|ESPECIALIDAD|SECCION|CORREO',
      };
    }
    const [c, n, an, esp, sec, cor] = parts;
    const cleanCode = c.toUpperCase();
    if (db.students.some((s) => s.codigo.toUpperCase() === cleanCode)) {
      return { reply: `❌ El código ${cleanCode} ya existe.` };
    }
    const newStudent: Student = {
      codigo: cleanCode,
      nombre: n,
      anio: an || '1°',
      especialidad: esp || 'General',
      seccion: sec || 'A',
      correo: cor || '',
      estado: 'ACTIVO',
      fotoUrl: '',
      creado: new Date().toISOString(),
    };
    db.students.unshift(newStudent);
    saveDatabase();
    broadcastEvent('students_updated', { students: db.students });
    return {
      student: newStudent,
      reply: `✅ Estudiante registrado exitosamente (Super Admin):\nCódigo: ${newStudent.codigo}\nNombre: ${newStudent.nombre}\nAño: ${newStudent.anio}\nEspecialidad: ${newStudent.especialidad}\nSección: ${newStudent.seccion}`,
    };
  }

  if (text.startsWith('/baja ')) {
    const code = text.substring(6).trim().toUpperCase();
    const student = db.students.find((s) => s.codigo.toUpperCase() === code);
    if (!student) return { reply: `❌ No existe el estudiante con código ${code}.` };
    student.estado = 'INACTIVO';
    saveDatabase();
    broadcastEvent('students_updated', { students: db.students });
    return { reply: `⚠️ Estudiante ${student.nombre} (${code}) marcado como INACTIVO.` };
  }

  if (text.startsWith('/activar ')) {
    const code = text.substring(9).trim().toUpperCase();
    const student = db.students.find((s) => s.codigo.toUpperCase() === code);
    if (!student) return { reply: `❌ No existe el estudiante con código ${code}.` };
    student.estado = 'ACTIVO';
    saveDatabase();
    broadcastEvent('students_updated', { students: db.students });
    return { reply: `✅ Estudiante ${student.nombre} (${code}) reactivado como ACTIVO.` };
  }

  if (text.startsWith('/eliminar ')) {
    const code = text.substring(10).trim().toUpperCase();
    const idx = db.students.findIndex((s) => s.codigo.toUpperCase() === code);
    if (idx === -1) return { reply: `❌ No existe el estudiante con código ${code}.` };
    const removed = db.students.splice(idx, 1)[0];
    saveDatabase();
    broadcastEvent('students_updated', { students: db.students });
    return { reply: `🗑️ Estudiante ${removed.nombre} (${code}) eliminado definitivamente de la base de datos.` };
  }

  return {
    reply: `Comando no reconocido. Escribe /start o /ayuda para ver la lista de comandos disponibles.`,
  };
}

// Telegram Bot Simulation endpoint
app.post('/api/bot/simulate', (req: Request, res: Response) => {
  const { command } = req.body;
  const result = processBotCommand(command);
  return res.json({ ok: true, ...result });
});

// Telegram Real Webhook endpoint (POST /api/bot/webhook and POST /exec)
const handleTelegramWebhook = async (req: Request, res: Response) => {
  try {
    const update = req.body;
    const msg = update?.message;
    if (msg && msg.text && msg.chat) {
      const chatId = String(msg.chat.id);
      const fromId = msg.from ? String(msg.from.id) : undefined;
      const result = processBotCommand(msg.text, fromId);

      const token = db.settings.botToken;
      if (token && chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: result.reply }),
        });
      }
    }
    return res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).send('error');
  }
};

app.post('/api/bot/webhook', handleTelegramWebhook);
app.post('/exec', handleTelegramWebhook);

// Reset Database to 0 endpoint
app.post('/api/database/reset', (_req: Request, res: Response) => {
  db.students = [];
  db.attendances = [];
  saveDatabase();
  broadcastEvent('students_updated', { students: [] });
  broadcastEvent('attendance_cleared', {});
  return res.json({ ok: true, message: 'Base de datos reiniciada a cero.' });
});

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de Asistencia Estudiantil listo en http://localhost:${PORT}`);
  });
}

startServer();
