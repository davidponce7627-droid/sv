import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, SystemSettings, ActiveTab } from './types';
import { Navigation } from './components/Navigation';
import { ScanStation } from './components/ScanStation';
import { StudentDirectory } from './components/StudentDirectory';
import { AttendanceView } from './components/AttendanceView';
import { CarnetDesigner } from './components/CarnetDesigner';
import { ArduinoHardwareHub } from './components/ArduinoHardwareHub';
import { TelegramBotPanel } from './components/TelegramBotPanel';
import { GuideReadme } from './components/GuideReadme';
import { AdminGateModal } from './components/AdminGateModal';
import { setSoundEnabled, isSoundEnabled } from './utils/audio';
import { getElSalvadorDate } from './utils/date';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('kiosk');
  const [adminAuthId, setAdminAuthId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('school_admin_id') : null;
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    nombreInstituto: 'INSTITUTO NACIONAL TÉCNICO INDUSTRIAL',
    lemaInstituto: 'Ciencia, Tecnología y Futuro',
    colorPrincipal: '#1E40AF',
    colorFondo: '#EAF5F8',
    deviceKey: 'ARDUINO_SECRET_KEY_2026',
    hookSecret: 'TELEGRAM_HOOK_SECRET_XYZ',
    botToken: '',
    adminIds: '',
    duplicadoVentanaSegundos: 60,
  });

  const [selectedStudentForCarnet, setSelectedStudentForCarnet] = useState<Student | null>(null);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [lastScanEvent, setLastScanEvent] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [resStudents, resAttendance, resSettings] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/attendance'),
        fetch('/api/settings'),
      ]);

      if (resStudents.ok) {
        const data = await resStudents.json();
        if (data.students) setStudents(data.students);
      }
      if (resAttendance.ok) {
        const data = await resAttendance.json();
        if (data.attendances) setAttendances(data.attendances);
      }
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.warn('Initial data load note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for real-time Server-Sent Events from Arduino / ESP-01 / Web
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          setSseConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'scan_result') {
              setLastScanEvent(parsed.data);
              // Also refresh attendance
              if (parsed.data.record) {
                setAttendances((prev) => [parsed.data.record, ...prev]);
              }
            } else if (parsed.type === 'students_updated') {
              if (parsed.data.students) {
                setStudents(parsed.data.students);
              }
            } else if (parsed.type === 'settings_updated') {
              if (parsed.data.settings) {
                setSettings(parsed.data.settings);
              }
            } else if (parsed.type === 'attendance_cleared') {
              setAttendances([]);
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };

        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        console.warn('SSE connection init error:', err);
        setSseConnected(false);
      }
    };

    connectSSE();

    return () => {
      clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, []);

  // Sound toggle handler
  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  // Student management handlers
  const handleStudentRegistered = (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev.filter((s) => s.codigo !== newStudent.codigo)]);
  };

  const handleUpdateStudent = async (codigo: string, data: Partial<Student>) => {
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(codigo)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.ok && resData.student) {
        setStudents((prev) =>
          prev.map((s) => (s.codigo.toUpperCase() === codigo.toUpperCase() ? resData.student : s))
        );
      }
    } catch (err) {
      console.error('Update student error:', err);
    }
  };

  const handleDeleteStudent = async (codigo: string) => {
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(codigo)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.codigo.toUpperCase() !== codigo.toUpperCase()));
      }
    } catch (err) {
      console.error('Delete student error:', err);
    }
  };

  const handleSelectStudentForCarnet = (student: Student) => {
    setSelectedStudentForCarnet(student);
    setActiveTab('carnets');
  };

  // Settings update handler
  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Update settings error:', err);
    }
  };

  // Attendance clear handler
  const handleClearAttendances = async () => {
    try {
      await fetch('/api/attendance/clear', { method: 'DELETE' });
      setAttendances([]);
    } catch (err) {
      console.error('Clear attendance error:', err);
    }
  };

  // Database full reset handler (0 records)
  const handleResetDatabase = async () => {
    try {
      const res = await fetch('/api/database/reset', { method: 'POST' });
      if (res.ok) {
        setStudents([]);
        setAttendances([]);
        setSelectedStudentForCarnet(null);
      }
    } catch (err) {
      console.error('Reset database error:', err);
    }
  };

  const todayStr = getElSalvadorDate();
  const todayCount = attendances.filter(
    (a) => (a.fecha || getElSalvadorDate(a.fechaHora)) === todayStr && a.resultado === 'ENTRADA_EXITOSA'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sseConnected={sseConnected}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        todayCount={todayCount}
        adminId={adminAuthId}
        onLogout={() => {
          localStorage.removeItem('school_admin_id');
          setAdminAuthId(null);
        }}
      />

      {/* Admin Access Gate Modal: blocks screen until Admin ID is provided */}
      {!adminAuthId && (
        <AdminGateModal
          settings={settings}
          onAuthenticated={() => {
            const id = localStorage.getItem('school_admin_id');
            setAdminAuthId(id || 'ADMIN');
          }}
          onSaveInitialSetup={handleUpdateSettings}
        />
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'kiosk' && (
          <ScanStation
            students={students}
            recentAttendances={attendances}
            settings={settings}
            onStudentRegistered={handleStudentRegistered}
            onAttendanceAdded={(rec) => setAttendances((prev) => [rec, ...prev])}
            lastScanEvent={lastScanEvent}
          />
        )}

        {activeTab === 'students' && (
          <StudentDirectory
            students={students}
            onAddStudent={async (st) => {
              const res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(st),
              });
              const data = await res.json();
              if (data.ok && data.student) {
                handleStudentRegistered(data.student);
              }
            }}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onSelectStudentForCarnet={handleSelectStudentForCarnet}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView
            attendances={attendances}
            settings={settings}
            onClearAttendances={handleClearAttendances}
          />
        )}

        {activeTab === 'carnets' && (
          <CarnetDesigner
            students={students}
            settings={settings}
            selectedStudent={selectedStudentForCarnet}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'hardware' && (
          <ArduinoHardwareHub settings={settings} />
        )}

        {activeTab === 'bot' && (
          <TelegramBotPanel
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'guide' && (
          <GuideReadme
            settings={settings}
            onNavigateTab={setActiveTab}
            onResetDatabase={handleResetDatabase}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{settings.nombreInstituto}</span>
            <span>·</span>
            <span>Sistema de Asistencia Arduino Uno R3</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Módulo WiFi ESP-01</span>
            <span>·</span>
            <span>Lector de Barras USB Code 128</span>
            <span>·</span>
            <span>Bot de Telegram Integrado</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
