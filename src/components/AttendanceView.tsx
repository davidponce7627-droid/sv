import React, { useState } from 'react';
import { AttendanceRecord, SystemSettings } from '../types';
import {
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Search,
} from 'lucide-react';
import {
  getElSalvadorDate,
  getElSalvadorTime,
  getElSalvadorDateTime,
} from '../utils/date';

interface AttendanceViewProps {
  attendances: AttendanceRecord[];
  settings: SystemSettings;
  onClearAttendances: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendances,
  settings,
  onClearAttendances,
}) => {
  const todayStr = getElSalvadorDate();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');

  // Filter records using strict El Salvador date
  const filtered = attendances.filter((att) => {
    const recordDate = att.fecha || getElSalvadorDate(att.fechaHora);
    const matchesDate = !selectedDate || recordDate === selectedDate;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      att.nombre.toLowerCase().includes(q) ||
      att.codigo.toLowerCase().includes(q) ||
      att.especialidad.toLowerCase().includes(q);
    const matchesResult = resultFilter === 'ALL' || att.resultado === resultFilter;
    const matchesGrade = gradeFilter === 'ALL' || att.anio === gradeFilter;

    return matchesDate && matchesSearch && matchesResult && matchesGrade;
  });

  // Calculate day stats
  const dayRecords = attendances.filter(
    (a) => !selectedDate || (a.fecha || getElSalvadorDate(a.fechaHora)) === selectedDate
  );
  const validCount = dayRecords.filter((a) => a.resultado === 'ENTRADA_EXITOSA').length;
  const duplicateCount = dayRecords.filter((a) => a.resultado === 'DUPLICADO').length;
  const unknownCount = dayRecords.filter((a) => a.resultado === 'CODIGO_DESCONOCIDO_O_INACTIVO').length;

  // Export CSV formatted strictly with El Salvador timezone
  const handleExportCSV = () => {
    const headers = [
      'Fecha (El Salvador)',
      'Hora (El Salvador)',
      'Código',
      'Estudiante',
      'Año',
      'Especialidad',
      'Sección',
      'Resultado',
      'Origen',
      'Timestamp_ISO',
    ];
    const rows = filtered.map((r) => [
      r.fecha || getElSalvadorDate(r.fechaHora),
      r.hora || getElSalvadorTime(r.fechaHora),
      r.codigo,
      r.nombre,
      r.anio,
      r.especialidad,
      r.seccion,
      r.resultado,
      r.origen,
      r.fechaHora,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Asistencias_ElSalvador_${selectedDate || 'todas'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Registro Diario de Asistencias
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              🇸🇻 Hora Oficial: America/El_Salvador (UTC-6)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Historial de escaneos recibidos desde el Arduino Uno con sincronización horaria de El Salvador.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
          <button
            onClick={() => {
              if (confirm('¿Deseas reiniciar y limpiar el historial de asistencias registradas?')) {
                onClearAttendances();
              }
            }}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Limpiar registros"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Entradas Válidas</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {validCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">presentes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Escaneos Totales</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {dayRecords.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">lecturas</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Duplicados Filtrados</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {duplicateCount}
            </span>
            <span className="text-xs text-amber-600 font-medium">&lt;60s rebote</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Códigos Desconocidos</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {unknownCount}
            </span>
            <span className="text-xs text-red-600 font-medium">alertas</span>
          </div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
            />
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por nombre o código..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ENTRADA_EXITOSA">Entrada Exitosa</option>
            <option value="DUPLICADO">Duplicados</option>
            <option value="CODIGO_DESCONOCIDO_O_INACTIVO">Desconocidos</option>
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="ALL">Todos los Años</option>
            <option value="1°">1° Año</option>
            <option value="2°">2° Año</option>
            <option value="3°">3° Año</option>
          </select>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Hora (🇸🇻 El Salvador UTC-6)</th>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Año / Especialidad</th>
                <th className="py-3 px-4">Sección</th>
                <th className="py-3 px-4">Resultado</th>
                <th className="py-3 px-4">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No hay registros de asistencia para la fecha o filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const timeFormatted = r.hora || getElSalvadorTime(r.fechaHora);
                  const dateFormatted = r.fecha || getElSalvadorDate(r.fechaHora);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-blue-800">{timeFormatted}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {dateFormatted}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {r.codigo}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900">
                        {r.nombre}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-800">{r.anio || '—'}</span>
                        {r.especialidad && (
                          <span className="text-slate-500"> · {r.especialidad}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {r.seccion ? `Sección ${r.seccion}` : '—'}
                      </td>

                      <td className="py-3 px-4">
                        {r.resultado === 'ENTRADA_EXITOSA' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Entrada válida</span>
                          </span>
                        ) : r.resultado === 'DUPLICADO' ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Duplicado (&lt;60s)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            <span>No registrado / Inactivo</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {r.origen || 'ESP-01'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Registros listados: {filtered.length}</span>
          <span>Institución: {settings.nombreInstituto}</span>
        </div>
      </div>
    </div>
  );
};
