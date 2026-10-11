import React, { useState } from 'react';
import { SystemSettings } from '../types';
import {
  Send,
  Bot,
  Shield,
  Key,
  Smartphone,
  ExternalLink,
  Save,
  Check,
  RefreshCw,
} from 'lucide-react';
import { getElSalvadorShortTime } from '../utils/date';

interface TelegramBotPanelProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
}

export const TelegramBotPanel: React.FC<TelegramBotPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [botToken, setBotToken] = useState(settings.botToken || '');
  const [adminIds, setAdminIds] = useState(settings.adminIds || '');
  const [deviceKey, setDeviceKey] = useState(settings.deviceKey || '');
  const [hookSecret, setHookSecret] = useState(settings.hookSecret || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulator chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'bot'; text: string; time: string }>
  >([
    {
      sender: 'bot',
      text: '🏫 SISTEMA DE CONTROL ESTUDIANTIL ARDUINO\n\n¡Bienvenido al Bot de Asistencias! Puedes enviar /start o usar los botones para comenzar.',
      time: '12:00',
    },
  ]);
  const [commandInput, setCommandInput] = useState('/hoy');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenTestFeedback, setTokenTestFeedback] = useState<any>(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      botToken: botToken.trim(),
      adminIds: adminIds.trim(),
      deviceKey: deviceKey.trim(),
      hookSecret: hookSecret.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSendCommand = async (cmdToSend?: string) => {
    const text = (cmdToSend !== undefined ? cmdToSend : commandInput).trim();
    if (!text) return;

    const timeNow = getElSalvadorShortTime();
    setChatMessages((prev) => [...prev, { sender: 'user', text, time: timeNow }]);
    setCommandInput('');
    setIsSimulating(true);

    try {
      const res = await fetch('/api/bot/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text }),
      });
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: data.reply || 'Sin respuesta del bot.',
          time: getElSalvadorShortTime(),
        },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Error de simulación: ${err.message}`,
          time: timeNow,
        },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Bot de Telegram y Notificaciones en Vivo
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configura alertas automáticas para padres y administradores cuando los alumnos pasen asistencia en el Arduino.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Bot className="w-5 h-5 text-blue-700" />
                <span>Credenciales de Telegram</span>
              </div>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardado</span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Token del Bot (de @BotFather)
                </label>
                {botToken.trim() && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsTestingToken(true);
                      setTokenTestFeedback(null);
                      try {
                        const res = await fetch('/api/bot/test-token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token: botToken.trim() }),
                        });
                        const data = await res.json();
                        setTokenTestFeedback(data);
                      } catch (err: any) {
                        setTokenTestFeedback({ ok: false, error: err.message });
                      } finally {
                        setIsTestingToken(false);
                      }
                    }}
                    disabled={isTestingToken}
                    className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                  >
                    {isTestingToken ? 'Comprobando...' : 'Probar Conexión con Telegram'}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={botToken}
                onChange={(e) => {
                  setBotToken(e.target.value);
                  setTokenTestFeedback(null);
                }}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Crea el bot con <code>/newbot</code> en Telegram con <code>@BotFather</code>.
              </span>

              {tokenTestFeedback && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs border ${
                    tokenTestFeedback.ok
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {tokenTestFeedback.ok ? (
                    <div className="font-semibold">
                      ✅ ¡Conexión con Telegram exitosa! Bot activo: <strong>@{tokenTestFeedback.bot?.username}</strong> ({tokenTestFeedback.bot?.first_name}).
                    </div>
                  ) : (
                    <div>
                      ❌ Error: {tokenTestFeedback.error || 'Token no válido.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID de Administrador (ADMIN_IDS)
              </label>
              <input
                type="text"
                value={adminIds}
                onChange={(e) => setAdminIds(e.target.value)}
                placeholder="Ej. 12345678, 87654321 (separados por coma)"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tu ID numérico de Telegram (puedes obtenerlo escribiendo a <code>@userinfobot</code>).
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clave Arduino (DEVICE_KEY)
                </label>
                <input
                  type="text"
                  value={deviceKey}
                  onChange={(e) => setDeviceKey(e.target.value)}
                  placeholder="ARDUINO_SECRET_KEY..."
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secreto Webhook (HOOK_SECRET)
                </label>
                <input
                  type="text"
                  value={hookSecret}
                  onChange={(e) => setHookSecret(e.target.value)}
                  placeholder="HOOK_SECRET_XYZ..."
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración del Bot</span>
            </button>
          </form>

          {/* Quick Guide Card */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <span className="font-semibold text-slate-800 block">Comandos Soportados por el Bot:</span>
            <ul className="space-y-1 font-mono text-[11px]">
              <li><strong className="text-blue-700">/hoy</strong> — Resumen de asistencias válidas del día.</li>
              <li><strong className="text-blue-700">/buscar [nombre o código]</strong> — Consultar alumno.</li>
              <li><strong className="text-blue-700">/carnet [código]</strong> — Información para carnet.</li>
              <li><strong className="text-blue-700">/alta COD|NOMBRE|AÑO|ESP|SEC|CORREO</strong> — Alta rápida.</li>
              <li><strong className="text-blue-700">/estado</strong> — Reporte de estado del servidor y conteo.</li>
            </ul>
          </div>
        </div>

        {/* Right: Phone Simulator */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800">
            {/* Phone Speaker & Camera Notch */}
            <div className="h-5 flex items-center justify-center gap-2 mb-2">
              <div className="w-12 h-1 bg-slate-700 rounded-full" />
              <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
            </div>

            {/* Telegram App Container */}
            <div className="bg-[#0E1621] rounded-2xl overflow-hidden flex flex-col h-[520px] text-white">
              {/* Telegram App Header */}
              <div className="bg-[#17212B] p-3 flex items-center gap-3 border-b border-slate-800">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                  🤖
                </div>
                <div>
                  <div className="font-semibold text-xs leading-none">
                    Bot Asistencia Escolar
                  </div>
                  <div className="text-[10px] text-blue-400 mt-0.5">bot activo</div>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-line leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#2B5278] text-white rounded-br-none'
                          : 'bg-[#182533] text-slate-100 rounded-bl-none border border-slate-700/50'
                      }`}
                    >
                      {msg.text}
                      <span className="block text-[9px] text-slate-400 text-right mt-1">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                {isSimulating && (
                  <div className="text-[11px] text-slate-400 italic">El bot está escribiendo...</div>
                )}
              </div>

              {/* Quick Command Buttons */}
              <div className="p-2 bg-[#17212B] border-t border-slate-800 flex flex-wrap gap-1">
                {['/start', '/hoy', '/buscar EST000123', '/carnet EST000123', '/estado'].map(
                  (cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => handleSendCommand(cmd)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-mono transition-colors cursor-pointer"
                    >
                      {cmd}
                    </button>
                  )
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendCommand();
                }}
                className="p-2 bg-[#17212B] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Escribe un comando..."
                  className="flex-1 px-3 py-1.5 bg-[#0E1621] border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!commandInput.trim() || isSimulating}
                  className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
