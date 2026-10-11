import React, { useState, useEffect } from 'react';
import { ActiveTab } from '../types';
import { Volume2, VolumeX, Cpu, Bell, CheckCircle2, Lock, LogOut, Clock } from 'lucide-react';
import { getElSalvadorTime } from '../utils/date';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  sseConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  todayCount: number;
  adminId?: string | null;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  sseConnected,
  soundEnabled,
  onToggleSound,
  todayCount,
  adminId,
  onLogout,
}) => {
  const [svTime, setSvTime] = useState(getElSalvadorTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setSvTime(getElSalvadorTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <button
              onClick={() => onTabChange('kiosk')}
              className="text-left cursor-pointer group"
            >
              <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors whitespace-nowrap block">
                Control Estudiantil
              </span>
              <span className="text-xs text-slate-500 block -mt-1 font-mono">
                Arduino Uno & ESP-01
              </span>
            </button>
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => onTabChange('kiosk')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'kiosk'
                  ? 'text-blue-700 font-semibold border-b-2 border-blue-700'
                  : ''
              }`}
            >
              Estación de Escaneo
            </button>
            <button
              onClick={() => onTabChange('students')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'students'
                  ? 'text-blue-700 font-semibold border-b-2 border-blue-700'
                  : ''
              }`}
            >
              Estudiantes
            </button>
            <button
              onClick={() => onTabChange('attendance')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 flex items-center gap-1.5 ${
                activeTab === 'attendance'
                  ? 'text-blue-700 font-semibold border-b-2 border-blue-700'
                  : ''
              }`}
            >
              <span>Asistencias</span>
              {todayCount > 0 && (
                <span className="text-xs bg-blue-50 text-blue-700 font-mono px-1.5 py-0.2 rounded-sm">
                  {todayCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onTabChange('carnets')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'carnets'
                  ? 'text-blue-700 font-semibold border-b-2 border-blue-700'
                  : ''
              }`}
            >
              Diseño de Carnets
            </button>
            <button
              onClick={() => onTabChange('hardware')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'hardware'
                  ? 'text-blue-700 font-semibold border-b-2 border-blue-700'
                  : ''
              }`}
            >
              Arduino & ESP-01
            </button>
            <button
              onClick={() => onTabChange('bot')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'bot'
                  ? 'text-blue-700 font-semibold border-b-2 border-blue-700'
                  : ''
              }`}
            >
              Bot Telegram
            </button>
            <button
              onClick={() => onTabChange('guide')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'guide'
                  ? 'text-blue-700 font-semibold border-b-2 border-blue-700'
                  : ''
              }`}
            >
              Guía de Enlace
            </button>
          </nav>

          {/* Zone 3: Connection & Action Zone */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live El Salvador Clock */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono text-blue-900"
              title="Hora Oficial de El Salvador (America/El_Salvador / UTC-6)"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold text-[11px] text-blue-800">🇸🇻 SV:</span>
              <span className="tabular-nums font-bold text-blue-950">{svTime}</span>
            </div>

            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Silenciar sonidos del escáner' : 'Activar sonidos del escáner'}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-blue-700" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <div
              className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg"
              title={sseConnected ? 'Conectado a la sincronización en vivo' : 'Reconectando con el servidor'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  sseConnected ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline">
                {sseConnected ? 'ESP/Arduino Online' : 'Sincronizando'}
              </span>
            </div>

            <button
              onClick={() => onTabChange('kiosk')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Modo Entrada Kiosko</span>
            </button>

            {adminId && onLogout && (
              <button
                onClick={onLogout}
                title={`Admin conectado: ${adminId}. Haz clic para bloquear pantalla.`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono transition-colors cursor-pointer border border-slate-200"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Admin: {adminId}</span>
                <LogOut className="w-3 h-3 text-slate-400 ml-1" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-slate-100 text-xs font-medium text-slate-600 gap-4 no-scrollbar">
          <button
            onClick={() => onTabChange('kiosk')}
            className={`whitespace-nowrap ${activeTab === 'kiosk' ? 'text-blue-700 font-bold' : ''}`}
          >
            Escaneo
          </button>
          <button
            onClick={() => onTabChange('students')}
            className={`whitespace-nowrap ${activeTab === 'students' ? 'text-blue-700 font-bold' : ''}`}
          >
            Estudiantes
          </button>
          <button
            onClick={() => onTabChange('attendance')}
            className={`whitespace-nowrap ${activeTab === 'attendance' ? 'text-blue-700 font-bold' : ''}`}
          >
            Asistencias ({todayCount})
          </button>
          <button
            onClick={() => onTabChange('carnets')}
            className={`whitespace-nowrap ${activeTab === 'carnets' ? 'text-blue-700 font-bold' : ''}`}
          >
            Carnets
          </button>
          <button
            onClick={() => onTabChange('hardware')}
            className={`whitespace-nowrap ${activeTab === 'hardware' ? 'text-blue-700 font-bold' : ''}`}
          >
            Arduino
          </button>
          <button
            onClick={() => onTabChange('bot')}
            className={`whitespace-nowrap ${activeTab === 'bot' ? 'text-blue-700 font-bold' : ''}`}
          >
            Bot
          </button>
          <button
            onClick={() => onTabChange('guide')}
            className={`whitespace-nowrap ${activeTab === 'guide' ? 'text-blue-700 font-bold' : ''}`}
          >
            Guía
          </button>
        </div>
      </div>
    </header>
  );
};
