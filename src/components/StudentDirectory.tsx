import React, { useState } from 'react';
import { Student } from '../types';
import { Barcode128 } from '../utils/barcode128';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  CreditCard,
  CheckCircle,
  XCircle,
  Filter,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { processImageFile } from '../utils/imageUpload';

interface StudentDirectoryProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (codigo: string, data: Partial<Student>) => void;
  onDeleteStudent: (codigo: string) => void;
  onSelectStudentForCarnet: (student: Student) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onSelectStudentForCarnet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnio, setFilterAnio] = useState('ALL');
  const [filterEspecialidad, setFilterEspecialidad] = useState('ALL');
  const [filterEstado, setFilterEstado] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    anio: '1°',
    especialidad: 'Desarrollo de Software',
    seccion: 'A',
    correo: '',
    estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
    fotoUrl: '',
  });

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.codigo.toLowerCase().includes(q) ||
      s.nombre.toLowerCase().includes(q) ||
      s.correo.toLowerCase().includes(q);
    const matchesAnio = filterAnio === 'ALL' || s.anio === filterAnio;
    const matchesEsp = filterEspecialidad === 'ALL' || s.especialidad === filterEspecialidad;
    const matchesEstado = filterEstado === 'ALL' || s.estado === filterEstado;
    return matchesQuery && matchesAnio && matchesEsp && matchesEstado;
  });

  const handleOpenAdd = () => {
    // Generate next suggested code
    const count = students.length + 1;
    const nextCode = `EST000${count < 100 ? (count < 10 ? '0' + count : count) : count}`;
    setEditingStudent(null);
    setFormData({
      codigo: nextCode,
      nombre: '',
      anio: '1°',
      especialidad: 'Desarrollo de Software',
      seccion: 'A',
      correo: '',
      estado: 'ACTIVO',
      fotoUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      codigo: s.codigo,
      nombre: s.nombre,
      anio: s.anio,
      especialidad: s.especialidad,
      seccion: s.seccion,
      correo: s.correo,
      estado: s.estado,
      fotoUrl: s.fotoUrl,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim()) return;

    if (editingStudent) {
      await onUpdateStudent(editingStudent.codigo, formData);
    } else {
      await onAddStudent({
        ...formData,
        codigo: formData.codigo.trim().toUpperCase(),
        creado: new Date().toISOString(),
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Padrón de Estudiantes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra el registro escolar, credenciales con código de barras y estado de matrícula.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Estudiante</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, nombre o correo..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-700 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterAnio}
            onChange={(e) => setFilterAnio(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="ALL">Todos los Años</option>
            <option value="1°">1° Año</option>
            <option value="2°">2° Año</option>
            <option value="3°">3° Año</option>
          </select>

          <select
            value={filterEspecialidad}
            onChange={(e) => setFilterEspecialidad(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="ALL">Todas las Especialidades</option>
            <option value="Desarrollo de Software">Desarrollo de Software</option>
            <option value="Electrónica Industrial">Electrónica Industrial</option>
            <option value="Mantenimiento de Redes">Mantenimiento de Redes</option>
            <option value="Automotriz">Automotriz</option>
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>
      </div>

      {/* High-Density Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Código / Barcode</th>
                <th className="py-3 px-4">Año & Especialidad</th>
                <th className="py-3 px-4">Sección</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <p className="text-slate-500 font-medium text-xs">
                        {students.length === 0
                          ? 'Base de datos nueva (0 registros). Registra a tu primer estudiante o escanea un carnet con el Arduino.'
                          : 'No se encontraron estudiantes que coincidan con los filtros aplicados.'}
                      </p>
                      {students.length === 0 && (
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Registrar Primer Estudiante</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.codigo} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-500">
                          {st.fotoUrl ? (
                            <img
                              src={st.fotoUrl}
                              alt={st.nombre}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            st.nombre.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {st.nombre}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {st.correo || 'Sin correo asignado'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-slate-800">
                        {st.codigo}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-medium">{st.anio}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-600">{st.especialidad}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">
                        Sección {st.seccion}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          st.estado === 'ACTIVO'
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            st.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{st.estado}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onSelectStudentForCarnet(st)}
                          title="Diseñar e imprimir carnet"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(st)}
                          title="Editar información"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar al estudiante ${st.nombre} (${st.codigo})?`)) {
                              onDeleteStudent(st.codigo);
                            }
                          }}
                          title="Eliminar estudiante"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Total inscritos: {students.length} estudiantes</span>
          <span>Mostrando: {filteredStudents.length} resultados</span>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingStudent ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de Barra *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStudent}
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    placeholder="EST000123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:border-blue-700 focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de Matrícula
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="ACTIVO">Activo (Habilitado)</option>
                    <option value="INACTIVO">Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Ana Beatriz Pérez González"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Año
                  </label>
                  <select
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
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
                    value={formData.seccion}
                    onChange={(e) => setFormData({ ...formData, seccion: e.target.value })}
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
                    value={formData.especialidad}
                    onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Desarrollo de Software">Software</option>
                    <option value="Electrónica Industrial">Electrónica</option>
                    <option value="Mantenimiento de Redes">Redes</option>
                    <option value="Automotriz">Automotriz</option>
                    <option value="Administración">Administración</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  placeholder="estudiante@escuela.edu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-700 focus:outline-hidden"
                />
              </div>

              {/* Student Photo: File Upload & URL */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Fotografía del Estudiante
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-20 rounded-lg bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                    {formData.fotoUrl ? (
                      <img
                        src={formData.fotoUrl}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors border border-slate-300">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto desde Archivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64 = await processImageFile(file);
                              setFormData({ ...formData, fotoUrl: base64 });
                            } catch (err: any) {
                              alert(err.message || 'Error al procesar foto');
                            }
                          }
                        }}
                      />
                    </label>

                    {formData.fotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, fotoUrl: '' })}
                        className="block text-[11px] text-red-600 hover:underline cursor-pointer"
                      >
                        Eliminar foto
                      </button>
                    )}

                    <input
                      type="url"
                      value={formData.fotoUrl.startsWith('data:') ? '' : formData.fotoUrl}
                      onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
                      placeholder="O pega enlace URL directo https://..."
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* Barcode preview and testing */}
              {formData.codigo && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center">
                  <span className="text-[11px] text-slate-500 mb-1">
                    Código de Barras Generado (Code 128 listo para escanear):
                  </span>
                  <Barcode128 value={formData.codigo} height={40} />
                  <span className="text-[10px] text-slate-400 mt-1">
                    Puedes apuntar tu pistola de código de barras a la pantalla para probarlo directamente.
                  </span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  {editingStudent ? 'Guardar Cambios' : 'Registrar Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
