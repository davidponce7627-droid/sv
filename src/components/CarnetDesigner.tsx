import React, { useState } from 'react';
import { Student, SystemSettings } from '../types';
import { Barcode128 } from '../utils/barcode128';
import {
  Printer,
  Sliders,
  Users,
  CreditCard,
  Building,
  Palette,
  Check,
} from 'lucide-react';

interface CarnetDesignerProps {
  students: Student[];
  settings: SystemSettings;
  selectedStudent: Student | null;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
}

export const CarnetDesigner: React.FC<CarnetDesignerProps> = ({
  students,
  settings,
  selectedStudent,
  onUpdateSettings,
}) => {
  const [currentStudentCode, setCurrentStudentCode] = useState<string>(
    selectedStudent ? selectedStudent.codigo : students[0]?.codigo || 'EST000123'
  );
  const [batchMode, setBatchMode] = useState<'SINGLE' | 'YEAR' | 'ALL'>('SINGLE');
  const [selectedBatchYear, setSelectedBatchYear] = useState('3°');

  // Institution template properties
  const [institutionName, setInstitutionName] = useState(settings.nombreInstituto);
  const [primaryColor, setPrimaryColor] = useState(settings.colorPrincipal || '#1E40AF');
  const [bgColor, setBgColor] = useState(settings.colorFondo || '#EAF5F8');

  // The active student for single preview
  const activeStudent =
    students.find((s) => s.codigo === currentStudentCode) ||
    selectedStudent ||
    students[0] || {
      codigo: 'EST000123',
      nombre: 'Ana Beatriz Pérez',
      anio: '3°',
      especialidad: 'Desarrollo de Software',
      seccion: 'A',
      correo: 'ana.perez@escuela.edu',
      estado: 'ACTIVO',
      fotoUrl: '',
      creado: '',
    };

  // Determine list for batch printing
  const batchStudents =
    batchMode === 'ALL'
      ? students.filter((s) => s.estado === 'ACTIVO')
      : batchMode === 'YEAR'
      ? students.filter((s) => s.estado === 'ACTIVO' && s.anio === selectedBatchYear)
      : [activeStudent];

  const handleSaveInstituteSettings = () => {
    onUpdateSettings({
      nombreInstituto: institutionName,
      colorPrincipal: primaryColor,
      colorFondo: bgColor,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header & Print Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Plantilla y Generador de Carnets
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Genera credenciales estudiantiles verticales (54 × 85.6 mm) con código de barras Code 128 listo para escanear.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Carnet(s)</span>
          </button>
        </div>
      </div>

      {/* Editor Controls & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Print Mode Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Modo de Emisión
            </span>

            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setBatchMode('SINGLE')}
                className={`py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                  batchMode === 'SINGLE'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setBatchMode('YEAR')}
                className={`py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                  batchMode === 'YEAR'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Año
              </button>
              <button
                type="button"
                onClick={() => setBatchMode('ALL')}
                className={`py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                  batchMode === 'ALL'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos Activos
              </button>
            </div>

            {batchMode === 'SINGLE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seleccionar Estudiante
                </label>
                {students.length === 0 ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                    Mostrando plantilla base. Agrega estudiantes en el padrón o por escaneo para visualizarlos aquí.
                  </div>
                ) : (
                  <select
                    value={currentStudentCode}
                    onChange={(e) => setCurrentStudentCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  >
                    {students.map((st) => (
                      <option key={st.codigo} value={st.codigo}>
                        {st.codigo} — {st.nombre} ({st.anio} {st.seccion})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {batchMode === 'YEAR' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seleccionar Año
                </label>
                <select
                  value={selectedBatchYear}
                  onChange={(e) => setSelectedBatchYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="1°">1° Año ({students.filter((s) => s.anio === '1°').length} estudiantes)</option>
                  <option value="2°">2° Año ({students.filter((s) => s.anio === '2°').length} estudiantes)</option>
                  <option value="3°">3° Año ({students.filter((s) => s.anio === '3°').length} estudiantes)</option>
                </select>
              </div>
            )}

            {batchMode === 'ALL' && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Se generarán <span className="font-bold text-slate-800">{batchStudents.length}</span> carnets en una cuadrícula optimizada para impresión en hoja carta o PVC.
              </div>
            )}
          </div>

          {/* Institutional Template Customization */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Personalización de la Plantilla
            </span>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Institución
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="INSTITUTO NACIONAL..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700 uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color de Encabezado
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color de Fondo Carnet
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveInstituteSettings}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Guardar Plantilla Institucional
            </button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-100/70 p-8 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 block">
            Vista Previa de Carnet Vertical (54 mm × 85.6 mm)
          </span>

          {/* The Single Card Preview */}
          <div className="shadow-lg hover:shadow-xl transition-shadow rounded-2xl overflow-hidden">
            <CarnetCard
              student={activeStudent}
              institutionName={institutionName}
              primaryColor={primaryColor}
              bgColor={bgColor}
            />
          </div>

          <p className="text-xs text-slate-500 text-center mt-6 max-w-sm">
            Diseño vertical con proporción ISO/IEC 7810 ID-1 (CR80). Incluye código Code 128 listo para ser leído por pistolas USB y módulos Arduino.
          </p>
        </div>
      </div>

      {/* Batch Cards Grid (Always rendered, used directly for @media print) */}
      <div id="print-carnets-container" className="pt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 no-print">
          Cuadrícula de Carnets a Imprimir ({batchStudents.length} unidades):
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4">
          {batchStudents.map((st) => (
            <div key={st.codigo} className="flex justify-center break-inside-avoid">
              <CarnetCard
                student={st}
                institutionName={institutionName}
                primaryColor={primaryColor}
                bgColor={bgColor}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Render Individual Carnet Card Component
interface CarnetCardProps {
  student: Student;
  institutionName: string;
  primaryColor: string;
  bgColor: string;
}

export const CarnetCard: React.FC<CarnetCardProps> = ({
  student,
  institutionName,
  primaryColor,
  bgColor,
}) => {
  return (
    <div
      style={{ backgroundColor: bgColor }}
      className="w-[230px] h-[360px] rounded-xl overflow-hidden border border-slate-300 shadow-xs flex flex-col justify-between select-none relative font-sans text-slate-900"
    >
      {/* Institutional Top Header Band */}
      <div
        style={{ backgroundColor: primaryColor }}
        className="pt-3 pb-2 px-3 text-white text-center shadow-xs shrink-0"
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold">
            LOGO
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider truncate flex-1 px-1">
            {institutionName}
          </span>
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold">
            INST
          </div>
        </div>
        <div className="text-[8px] font-medium tracking-widest uppercase opacity-90">
          CARNET ESTUDIANTIL
        </div>
      </div>

      {/* Student Photo */}
      <div className="flex flex-col items-center pt-2 px-3">
        <div className="w-20 h-24 rounded-lg bg-slate-200 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center">
          {student.fotoUrl ? (
            <img
              src={student.fotoUrl}
              alt={student.nombre}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-semibold text-[10px] bg-slate-100">
              <span>FOTOGRAFÍA</span>
            </div>
          )}
        </div>

        {/* Student Name */}
        <h4 className="mt-2 text-xs font-bold text-center text-slate-900 leading-tight line-clamp-2 px-1">
          {student.nombre}
        </h4>

        {/* Academic Details */}
        <div className="mt-1 text-center text-[10px] space-y-0.5 text-slate-700">
          <div>
            <span className="font-bold">AÑO:</span> {student.anio || '—'}
          </div>
          <div
            style={{ color: primaryColor }}
            className="font-bold text-[10.5px] truncate max-w-[200px]"
          >
            {student.especialidad || 'General'}
          </div>
          <div>
            <span className="font-bold">SECCIÓN:</span> {student.seccion || 'A'}
          </div>
          {student.correo && (
            <div className="text-[8.5px] text-slate-500 truncate max-w-[200px]">
              {student.correo}
            </div>
          )}
        </div>
      </div>

      {/* Barcode & Student Code Footer */}
      <div className="pb-2.5 px-2 flex flex-col items-center justify-center bg-white/70 border-t border-slate-200/50 mt-1">
        <Barcode128
          value={student.codigo}
          height={30}
          barWidth={1.3}
          showText={false}
          className="scale-90"
        />
        <div className="text-[10px] font-mono font-bold text-slate-800 tracking-wider -mt-1">
          CÓDIGO: {student.codigo}
        </div>
      </div>
    </div>
  );
};
