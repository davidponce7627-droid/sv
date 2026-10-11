import React, { useState } from 'react';
import { SystemSettings } from '../types';
import {
  Lock,
  Key,
  Shield,
  Bot,
  CheckCircle2,
  AlertCircle,
  Building,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AdminGateModalProps {
  settings: SystemSettings;
  onAuthenticated: () => void;
  onSaveInitialSetup: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

export const AdminGateModal: React.FC<AdminGateModalProps> = ({
  settings,
  onAuthenticated,
  onSaveInitialSetup,
}) => {
  const hasConfiguredAdmin = !!(settings.adminIds && settings.adminIds.trim());

  // Login state for already configured admin
  const [inputAdminId, setInputAdminId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Setup state for brand new system (initial setup)
  const [setupAdminId, setSetupAdminId] = useState('');
  const [setupBotToken, setSetupBotToken] = useState('');
  const [setupDeviceKey, setSetupDeviceKey] = useState(settings.deviceKey || 'ARDUINO_SECRET_KEY_2026');
  const [setupInstituteName, setSetupInstituteName] = useState(settings.nombreInstituto || 'INSTITUTO NACIONAL');
  
  // Test bot token state
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [botTestResult, setBotTestResult] = useState<{
    ok: boolean;
    bot?: { username: string; first_name: string };
    error?: string;
  } | null>(null);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAdminId.trim()) return;

    setIsVerifying(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: inputAdminId.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        localStorage.setItem('school_admin_id', inputAdminId.trim());
        onAuthenticated();
      } else {
        setLoginError(data.message || 'Admin ID inválido. No tienes permisos de administrador.');
      }
    } catch (err: any) {
      setLoginError('Error de conexión al verificar credenciales.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Test Bot Token with Telegram getMe API
  const handleTestBotToken = async () => {
    if (!setupBotToken.trim()) return;
    setIsTestingBot(true);
    setBotTestResult(null);

    try {
      const res = await fetch('/api/bot/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: setupBotToken.trim() }),
      });
      const data = await res.json();
      setBotTestResult(data);
    } catch (err: any) {
      setBotTestResult({ ok: false, error: err.message });
    } finally {
      setIsTestingBot(false);
    }
  };

  // Handle Initial Setup Submit
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupAdminId.trim()) return;

    setIsVerifying(true);
    try {
      await onSaveInitialSetup({
        adminIds: setupAdminId.trim(),
        botToken: setupBotToken.trim(),
        deviceKey: setupDeviceKey.trim(),
        nombreInstituto: setupInstituteName.trim(),
      });
      localStorage.setItem('school_admin_id', setupAdminId.trim());
      onAuthenticated();
    } catch (err) {
      console.error('Setup error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Band */}
        <div className="bg-slate-900 p-6 text-white text-center space-y-2 relative">
          <div className="w-12 h-12 mx-auto rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {hasConfiguredAdmin ? 'Control de Acceso de Administrador' : 'Configuración Inicial del Sistema'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {hasConfiguredAdmin
              ? 'Ingresa tu Admin ID (Telegram ID autorizado) para acceder al panel de control escolar.'
              : 'Configura las credenciales maestras para el Bot de Telegram, Arduino Uno y tu colegio.'}
          </p>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {hasConfiguredAdmin ? (
            /* Mode 1: Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tu Admin ID (Telegram ID)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="password"
                    required
                    value={inputAdminId}
                    onChange={(e) => setInputAdminId(e.target.value)}
                    placeholder="Ingresa tu ID de administrador..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700 focus:bg-white font-mono"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Es el ID de usuario numérico que registraste para el bot de Telegram.
                </span>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !inputAdminId.trim()}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Ingresar al Panel de Asistencia</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Mode 2: First-Time Setup Wizard */
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <span className="font-semibold block">Configuración inicial requerida:</span>
                <p className="text-[11px] leading-relaxed">
                  Define tu <strong>Admin ID</strong> para que solo tú puedas entrar y dar órdenes al Bot de Telegram. Todo comenzará completamente desde cero.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Tu Admin ID (Telegram ID Numérico) *
                </label>
                <input
                  type="text"
                  required
                  value={setupAdminId}
                  onChange={(e) => setSetupAdminId(e.target.value)}
                  placeholder="Ej. 123456789 (puedes obtenerlo en @userinfobot)"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    2. Token del Bot de Telegram (de @BotFather)
                  </label>
                  {setupBotToken.trim() && (
                    <button
                      type="button"
                      onClick={handleTestBotToken}
                      disabled={isTestingBot}
                      className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                    >
                      {isTestingBot ? 'Probando...' : 'Probar Token'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={setupBotToken}
                  onChange={(e) => {
                    setSetupBotToken(e.target.value);
                    setBotTestResult(null);
                  }}
                  placeholder="Ej. 123456789:ABCdefGhIJKlmNoPQRs..."
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
                />

                {/* Bot test live feedback */}
                {botTestResult && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 border ${
                      botTestResult.ok
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    {botTestResult.ok ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          ¡Bot verificado con éxito! Conectado a <strong>@{botTestResult.bot?.username}</strong> ({botTestResult.bot?.first_name}).
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{botTestResult.error || 'Error al conectar con Telegram.'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Clave Arduino (DEVICE_KEY)
                  </label>
                  <input
                    type="text"
                    required
                    value={setupDeviceKey}
                    onChange={(e) => setSetupDeviceKey(e.target.value)}
                    placeholder="ARDUINO_SECRET_KEY..."
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Nombre del Instituto
                  </label>
                  <input
                    type="text"
                    required
                    value={setupInstituteName}
                    onChange={(e) => setSetupInstituteName(e.target.value)}
                    placeholder="Colegio / Instituto..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying || !setupAdminId.trim()}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Guardar Credenciales y Entrar al Sistema</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
