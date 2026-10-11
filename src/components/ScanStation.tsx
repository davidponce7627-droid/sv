import React, { useState, useEffect, useRef } from 'react';
import { Student, AttendanceRecord, SystemSettings } from '../types';
import { Barcode128 } from '../utils/barcode128';
import { playSuccessChime, playWarningBeep, playAlertBuzzer } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Barcode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserPlus,
  RefreshCw,
  Usb,
  Sparkles,
  ArrowRight,
  Clock,
  Send,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { processImageFile } from '../utils/imageUpload';
import { getElSalvadorTime } from '../utils/date';

interface ScanStationProps {
  students: Student[];
  recentAttendances: AttendanceRecord[];
  settings: SystemSettings;
  onStudentRegistered: (newStudent: Student) => void;
  onAttendanceAdded: (record: AttendanceRecord) => void;
  lastScanEvent: any;
}

export const ScanStation: React.FC<ScanStationProps> = ({
  students,
  recentAttendances,
  settings,
  onStudentRegistered,
  onAttendanceAdded,
  lastScanEvent,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    status: 'IDLE' | 'RECORDED' | 'DUPLICATE' | 'UNKNOWN_CODE';
    code: string;
    student?: Student | null;
    timestamp?: string;
    message?: string;
  }>({
    status: 'IDLE',
    code: '',
  });

  // Modal for first-time / unknown student quick registration
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [unregisteredCode, setUnregisteredCode] = useState('');
  const [newStudentForm, setNewStudentForm] = useState({
    nombre: '',
    anio: '1°',
    especialidad: 'Desarrollo de Software',
    seccion: 'A',
    correo: '',
    fotoUrl: '',
  });

  // Web Serial API state
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialLog, setSerialLog] = useState<string[]>([]);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [liveSvTime, setLiveSvTime] = useState(getElSalvadorTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSvTime(getElSalvadorTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync external SSE scan events
  useEffect(() => {
    if (!lastScanEvent) return;

    const eventTime = lastScanEvent.horaElSalvador || lastScanEvent.time || getElSalvadorTime();

    if (lastScanEvent.status === 'RECORDED') {
      playSuccessChime();
      setCurrentResult({
        status: 'RECORDED',
        code: lastScanEvent.code,
        student: lastScanEvent.student,
        timestamp: eventTime,
        message: '¡Asistencia registrada correctamente!',
      });
      if (lastScanEvent.record) {
        onAttendanceAdded(lastScanEvent.record);
      }
    } else if (lastScanEvent.status === 'DUPLICATE') {
      playWarningBeep();
      setCurrentResult({
        status: 'DUPLICATE',
        code: lastScanEvent.code,
        student: lastScanEvent.student,
        timestamp: eventTime,
        message: 'Escaneo repetido en menos de 60 segundos; no se duplicó la entrada.',
      });
      if (lastScanEvent.record) {
        onAttendanceAdded(lastScanEvent.record);
      }
    } else if (lastScanEvent.status === 'UNKNOWN_CODE') {
      playAlertBuzzer();
      setCurrentResult({
        status: 'UNKNOWN_CODE',
        code: lastScanEvent.code,
        student: null,
        timestamp: eventTime,
        message: 'Código no registrado o estudiante inactivo.',
      });
      setUnregisteredCode(lastScanEvent.code);
      setShowQuickRegister(true);
      if (lastScanEvent.record) {
        onAttendanceAdded(lastScanEvent.record);
      }
    }
  }, [lastScanEvent]);

  // Keep input focused for physical USB barcode gun scanning
  useEffect(() => {
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [currentResult]);

  // Handle local or manual barcode scan
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim().toUpperCase();
    if (!code) return;

    setIsScanning(true);
    setBarcodeInput('');

    try {
      const res = await fetch(`/api/scan?code=${encodeURIComponent(code)}&key=${encodeURIComponent(settings.deviceKey)}&origin=Kiosko-Web`);
      const data = await res.json();

      if (data.status === 'RECORDED') {
        playSuccessChime();
        setCurrentResult({
          status: 'RECORDED',
          code,
          student: data.student,
          timestamp: data.horaElSalvador || data.time || getElSalvadorTime(),
          message: 'Asistencia confirmada',
        });
      } else if (data.status === 'DUPLICATE') {
        playWarningBeep();
        const found = students.find((s) => s.codigo.toUpperCase() === code);
        setCurrentResult({
          status: 'DUPLICATE',
          code,
          student: found,
          timestamp: data.horaElSalvador || data.time || getElSalvadorTime(),
          message: 'Escaneo repetido; ya tiene registro de entrada en los últimos 60s.',
        });
      } else if (data.status === 'UNKNOWN_CODE') {
        playAlertBuzzer();
        setCurrentResult({
          status: 'UNKNOWN_CODE',
          code,
          student: null,
          timestamp: data.horaElSalvador || data.time || getElSalvadorTime(),
          message: 'Código de barra no encontrado en la base de datos.',
        });
        setUnregisteredCode(code);
        setShowQuickRegister(true);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
      barcodeInputRef.current?.focus();
    }
  };

  // Quick register unknown student
  const handleQuickRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.nombre.trim() || !unregisteredCode) return;

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: unregisteredCode,
          nombre: newStudentForm.nombre.trim(),
          anio: newStudentForm.anio,
          especialidad: newStudentForm.especialidad,
          seccion: newStudentForm.seccion,
          correo: newStudentForm.correo.trim(),
          fotoUrl: newStudentForm.fotoUrl.trim(),
          estado: 'ACTIVO',
        }),
      });

      const data = await res.json();
      if (data.ok && data.student) {
        onStudentRegistered(data.student);

        // Immediately record attendance for newly registered student
        const scanRes = await fetch(`/api/scan?code=${encodeURIComponent(unregisteredCode)}&key=${encodeURIComponent(settings.deviceKey)}&origin=Registro-Directo`);
        const scanData = await scanRes.json();

        playSuccessChime();
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } catch {
          // ignore
        }

        setCurrentResult({
          status: 'RECORDED',
          code: unregisteredCode,
          student: data.student,
          timestamp: getElSalvadorTime(),
          message: '¡Estudiante dado de alta y asistencia marcada con éxito!',
        });

        setShowQuickRegister(false);
        setNewStudentForm({
          nombre: '',
          anio: '1°',
          especialidad: 'Desarrollo de Software',
          seccion: 'A',
          correo: '',
          fotoUrl: '',
        });
      }
    } catch (err) {
      console.error('Quick registration error:', err);
    }
  };

  // Web Serial API: direct connect to Arduino Uno via USB
  const connectArduinoSerial = async () => {
    if (!('serial' in navigator)) {
      alert('Tu navegador no soporta Web Serial API. Usa Google Chrome, Microsoft Edge o ingresa los códigos con pistola USB o teclado.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setSerialConnected(true);

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let buffer = '';
      setSerialLog((prev) => [`[${new Date().toLocaleTimeString()}] Conectado a Arduino Uno (9600 baud)`, ...prev]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              setSerialLog((prev) => [`[Serial] ${trimmed}`, ...prev.slice(0, 20)]);
              // If line has code pattern or "SCAN:XYZ"
              const codeMatch = trimmed.match(/(?:SCAN:)?([A-Z0-9_-]{3,20})/i);
              if (codeMatch && codeMatch[1]) {
                const codeScanned = codeMatch[1].toUpperCase();
                setBarcodeInput(codeScanned);
                // Trigger scan
                fetch(`/api/scan?code=${encodeURIComponent(codeScanned)}&key=${encodeURIComponent(settings.deviceKey)}&origin=Arduino-Serial`)
                  .catch(console.error);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Serial connection error:', err);
      setSerialConnected(false);
      setSerialLog((prev) => [`[Error] ${err?.message || 'Conexión cancelada'}`, ...prev]);
    }
  };

  const disconnectArduinoSerial = async () => {
    try {
      if (readerRef.current) await readerRef.current.cancel();
      if (portRef.current) await portRef.current.close();
    } catch (err) {
      console.error(err);
    } finally {
      setSerialConnected(false);
      setSerialLog((prev) => [`[${new Date().toLocaleTimeString()}] Desconectado de Arduino Uno`, ...prev]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Kiosk Scan Input Header */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 md:p-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200/60">
              <Barcode className="w-4 h-4" />
              <span>Escáner de Asistencia Escolar Activo</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-mono font-semibold rounded-md border border-emerald-200">
              <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>🇸🇻 El Salvador: {liveSvTime}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Escanea el carnet estudiantil
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Acerca el carnet con código de barras al lector USB conectado al Arduino Uno o ingresa el código para registrar la entrada.
          </p>

          {/* Barcode scanner input bar */}
          <form onSubmit={handleScanSubmit} className="relative max-w-xl mx-auto pt-2">
            <div className="relative flex items-center">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanea con pistola de barras o escribe código (ej. EST000123)..."
                autoComplete="off"
                className="w-full pl-11 pr-28 py-3.5 bg-slate-50 border-2 border-slate-300 focus:border-blue-700 focus:bg-white focus:outline-hidden text-base font-mono rounded-xl transition-all shadow-inner"
              />
              <Barcode className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={isScanning || !barcodeInput.trim()}
                className="absolute right-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isScanning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>Registrar</span>
              </button>
            </div>
          </form>

          {/* Quick simulator test pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Códigos rápidos de prueba:</span>
            {students.slice(0, 3).map((st) => (
              <button
                key={st.codigo}
                type="button"
                onClick={() => {
                  setBarcodeInput(st.codigo);
                  fetch(`/api/scan?code=${encodeURIComponent(st.codigo)}&key=${encodeURIComponent(settings.deviceKey)}&origin=Test-Boton`)
                    .catch(console.error);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono transition-colors cursor-pointer"
              >
                {st.codigo} ({st.nombre.split(' ')[0]})
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const sampleUnknown = 'EST' + Math.floor(100000 + Math.random() * 900000);
                setBarcodeInput(sampleUnknown);
                fetch(`/api/scan?code=${encodeURIComponent(sampleUnknown)}&key=${encodeURIComponent(settings.deviceKey)}&origin=Test-Boton`)
                  .catch(console.error);
              }}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md font-mono transition-colors cursor-pointer border border-amber-200"
            >
              Probar Código No Registrado
            </button>
          </div>
        </div>
      </section>

      {/* Main Identification Display: Big visual card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Instant Student Identification Screen */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pantalla de Identificación
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {currentResult.timestamp ? `🇸🇻 Hora (El Salvador): ${currentResult.timestamp}` : 'Esperando escaneo...'}
              </span>
            </div>

            {/* Display State */}
            {currentResult.status === 'IDLE' && (
              <div className="py-16 text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Barcode className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Estación lista para recibir carnet
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                    Pasa el carnet por el escáner del Arduino Uno. El sistema reconocerá al alumno y notificará al bot.
                  </p>
                </div>
              </div>
            )}

            {currentResult.status === 'RECORDED' && currentResult.student && (
              <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-sm font-medium">
                    {currentResult.message || 'Asistencia registrada con éxito'}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-slate-50/70 p-6 rounded-xl border border-slate-200">
                  {/* Photo with fallback avatar */}
                  <div className="w-28 h-36 rounded-lg overflow-hidden bg-slate-200 border-2 border-white shadow-sm shrink-0 flex items-center justify-center">
                    {currentResult.student.fotoUrl ? (
                      <img
                        src={currentResult.student.fotoUrl}
                        alt={currentResult.student.nombre}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-semibold text-xs">
                        <span>Sin Foto</span>
                      </div>
                    )}
                  </div>

                  {/* Student Details */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="text-xs font-mono font-semibold text-blue-700">
                      CÓDIGO: {currentResult.student.codigo}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-snug">
                      {currentResult.student.nombre}
                    </h2>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                      <div>
                        <span className="text-xs text-slate-500 block">Grado / Año:</span>
                        <span className="font-semibold text-slate-800">
                          {currentResult.student.anio}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Sección:</span>
                        <span className="font-semibold text-slate-800">
                          Sección "{currentResult.student.seccion}"
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-slate-500 block">Especialidad Técnica:</span>
                        <span className="font-semibold text-blue-800">
                          {currentResult.student.especialidad}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barcode verification footer */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <Barcode128 value={currentResult.student.codigo} height={42} />
                </div>
              </div>
            )}

            {currentResult.status === 'DUPLICATE' && (
              <div className="py-6 space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-sm font-medium">
                    {currentResult.message}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <div className="text-sm font-mono text-slate-600">
                    CÓDIGO: {currentResult.code}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {currentResult.student ? currentResult.student.nombre : 'Estudiante'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    El sistema protege contra rebote o doble pase en menos de 60 segundos. No se agregó un duplicado.
                  </p>
                </div>
              </div>
            )}

            {currentResult.status === 'UNKNOWN_CODE' && (
              <div className="py-6 space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="text-sm font-medium">
                    Código de barras no registrado: <span className="font-mono font-bold">{currentResult.code}</span>
                  </div>
                </div>

                <div className="p-6 bg-amber-50/60 rounded-xl border border-amber-200 text-center space-y-3">
                  <h3 className="text-base font-bold text-amber-900">
                    ¿Es la primera vez que se escanea este carnet?
                  </h3>
                  <p className="text-xs text-amber-800 max-w-md mx-auto">
                    Puedes dar de alta a este estudiante de inmediato para asociar su código de barras y pasar lista.
                  </p>
                  <button
                    onClick={() => {
                      setUnregisteredCode(currentResult.code);
                      setShowQuickRegister(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Registrar a este estudiante ahora</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Anti-rebote: {settings.duplicadoVentanaSegundos}s</span>
            <span>Institución: {settings.nombreInstituto}</span>
          </div>
        </div>

        {/* Right: Hardware WiFi Console & Recent Scans Feed */}
        <div className="lg:col-span-5 space-y-6">
          {/* Autonomous WiFi Scanner status widget */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Receptor WiFi Autónomo</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-sm font-mono bg-emerald-50 text-emerald-700 font-semibold">
                WiFi Online
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p className="leading-relaxed">
                El <strong>Arduino Uno opera de forma 100% independiente</strong> en la entrada del colegio con su propio módulo USB y WiFi. No requiere estar conectado a ninguna computadora.
              </p>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1 font-mono text-[11px]">
                <div className="text-slate-400 font-sans text-[10px] font-semibold uppercase">
                  URL de enlace que llama el Arduino por WiFi:
                </div>
                <div className="text-blue-700 break-all select-all font-semibold">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/scan?code=CODIGO&key={settings.deviceKey}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Protocolo: HTTP GET WiFi</span>
                <span className="font-semibold text-emerald-700">Esperando escaneos inalámbricos...</span>
              </div>
            </div>
          </div>

          {/* Recent Scans Activity Log */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Últimos Escaneos Registrados</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Total: {recentAttendances.length}
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              {recentAttendances.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Aún no hay asistencias registradas hoy.
                </div>
              ) : (
                recentAttendances.slice(0, 8).map((record) => {
                  const timeStr = record.hora || getElSalvadorTime(record.fechaHora);
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs border border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {record.resultado === 'ENTRADA_EXITOSA' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        ) : record.resultado === 'DUPLICADO' ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 block truncate">
                            {record.nombre}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {record.codigo} · {record.anio} {record.seccion}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-slate-600 block text-[11px]">
                          {timeStr}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {record.origen || 'ESP-01'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal: First-Time / Unknown Student Quick Registration */}
      {showQuickRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <UserPlus className="w-5 h-5 text-blue-700" />
                <span>Alta Rápida de Estudiante</span>
              </div>
              <button
                onClick={() => setShowQuickRegister(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickRegisterSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <div className="font-semibold">Código detectado por el escáner:</div>
                <div className="font-mono text-base font-bold text-blue-800">{unregisteredCode}</div>
                <div>Asigna los datos del estudiante para registrar su carnet y pasar asistencia.</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo del Estudiante *
                </label>
                <input
                  type="text"
                  required
                  value={newStudentForm.nombre}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, nombre: e.target.value })}
                  placeholder="Ej. Ana Beatriz Pérez González"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-700 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Año / Grado
                  </label>
                  <select
                    value={newStudentForm.anio}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, anio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="1°">1° Año</option>
                    <option value="2°">2° Año</option>
                    <option value="3°">3° Año</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sección
                  </label>
                  <select
                    value={newStudentForm.seccion}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, seccion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="A">Sección A</option>
                    <option value="B">Sección B</option>
                    <option value="C">Sección C</option>
                    <option value="D">Sección D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Especialidad
                  </label>
                  <select
                    value={newStudentForm.especialidad}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, especialidad: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Desarrollo de Software">Software</option>
                    <option value="Electrónica Industrial">Electrónica</option>
                    <option value="Mantenimiento de Redes">Redes</option>
                    <option value="Automotriz">Automotriz</option>
                    <option value="Administración">Administración</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={newStudentForm.correo}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, correo: e.target.value })}
                  placeholder="estudiante@escuela.edu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-700 focus:outline-hidden"
                />
              </div>

              {/* Student Photo Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Fotografía del Estudiante
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-16 rounded-lg bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                    {newStudentForm.fotoUrl ? (
                      <img
                        src={newStudentForm.fotoUrl}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors border border-slate-300">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto de Archivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64 = await processImageFile(file);
                              setNewStudentForm({ ...newStudentForm, fotoUrl: base64 });
                            } catch (err: any) {
                              alert(err.message || 'Error al procesar foto');
                            }
                          }
                        }}
                      />
                    </label>

                    {newStudentForm.fotoUrl && (
                      <button
                        type="button"
                        onClick={() => setNewStudentForm({ ...newStudentForm, fotoUrl: '' })}
                        className="block text-[11px] text-red-600 hover:underline cursor-pointer"
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Barcode Generated for User's Barcode Gun */}
              {unregisteredCode && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center">
                  <span className="text-[11px] text-slate-500 mb-1">
                    Código de Barras Oficial Generado para tu Lector:
                  </span>
                  <Barcode128 value={unregisteredCode} height={36} />
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickRegister(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Guardar y Pasar Lista</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
