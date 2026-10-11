import React, { useState } from 'react';
import { SystemSettings } from '../types';
import {
  BookOpen,
  Wifi,
  Cpu,
  Bot,
  Copy,
  Check,
  CreditCard,
  ArrowRight,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface GuideReadmeProps {
  settings: SystemSettings;
  onNavigateTab: (tab: any) => void;
  onResetDatabase: () => void;
}

export const GuideReadme: React.FC<GuideReadmeProps> = ({
  settings,
  onNavigateTab,
  onResetDatabase,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-lgv6giuatkfh5gukxtskxq-359813822709.us-west1.run.app';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentación Oficial de Enlace</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manual de Conexión: Arduino Uno, WiFi y Bot Super Admin
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Instrucciones para poner en marcha el sistema desde cero con tu hardware autónomo y administrarlo desde Telegram.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('¿Estás seguro de dejar la base de datos en CERO registros? Se borrarán todos los estudiantes y asistencias de prueba.')) {
              onResetDatabase();
            }
          }}
          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          Dejar Web en Cero Registros
        </button>
      </div>

      {/* Step by step cards */}
      <div className="space-y-6">
        {/* Step 1: Arduino & WiFi Endpoint */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Enlazar el Arduino Uno a la Web mediante WiFi (ESP-01)
              </h2>
              <p className="text-xs text-slate-500">
                El Arduino Uno envía cada código de barras por WiFi mediante peticiones HTTP GET a este enlace.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Enlace Web (Endpoint) que debe consultar el Arduino:
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto">
              <span className="flex-1 break-all">
                {appUrl}/api/scan?code=CODIGO&key={settings.deviceKey}
              </span>
              <button
                onClick={() => copyText(`${appUrl}/api/scan?code=CODIGO&key=${settings.deviceKey}`, 'endpoint')}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Copiar enlace"
              >
                {copiedKey === 'endpoint' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">Parámetros del Arduino Sketch (.ino):</div>
              <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-slate-700">
                <li><code>HOST_IP: {typeof window !== 'undefined' ? window.location.hostname : 'tu-app.run.app'}</code></li>
                <li><code>DEVICE_KEY: {settings.deviceKey}</code></li>
                <li><code>PORT: 80</code></li>
              </ul>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">Conexión Física Autónoma:</div>
              <p className="text-[11px] leading-relaxed">
                Alimenta el Arduino Uno con un cargador de 9V a la pared. Conecta la pistola de barras al puerto USB Host y el ESP-01 a los pines 2 (RX) y 3 (TX con divisor).
              </p>
            </div>
          </div>
        </section>

        {/* Step 2: Telegram Bot as Super Admin */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bot de Telegram: Control Total como Super Administrador
              </h2>
              <p className="text-xs text-slate-500">
                Podrás dar de alta estudiantes, consultar carnets, ver asistencias y reiniciar el sistema desde tu celular.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                En Telegram abre <strong>@BotFather</strong> y escribe <code>/newbot</code>. Copia el token generado.
              </li>
              <li>
                Abre <strong>@userinfobot</strong> en Telegram para obtener tu <strong>ID numérico</strong>.
              </li>
              <li>
                Ingresa a la pestaña <strong>"Bot Telegram"</strong> en esta web, pega tu token y tu ID de administrador y haz clic en Guardar.
              </li>
              <li>
                Para conectar el Webhook oficial en Telegram, ejecuta este comando en tu terminal o navegador:
              </li>
            </ol>

            <div className="flex items-center gap-2 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto">
              <span className="flex-1 break-all">
                curl -X POST "https://api.telegram.org/bot&lt;TU_BOT_TOKEN&gt;/setWebhook?url={appUrl}/api/bot/webhook"
              </span>
              <button
                onClick={() =>
                  copyText(
                    `curl -X POST "https://api.telegram.org/bot${settings.botToken || '<TU_BOT_TOKEN>'}/setWebhook?url=${appUrl}/api/bot/webhook"`,
                    'webhook'
                  )
                }
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Copiar comando webhook"
              >
                {copiedKey === 'webhook' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800">Comandos Principales de Administración:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-700">/alta COD|NOM|AÑO|ESP|SEC|CORREO</span>
                <span className="block text-[11px] text-slate-500 font-sans mt-0.5">
                  Registra alumno en el padrón inmediatamente.
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-700">/carnet CODIGO</span>
                <span className="block text-[11px] text-slate-500 font-sans mt-0.5">
                  Muestra la credencial lista para el alumno.
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-700">/baja CODIGO / /activar CODIGO</span>
                <span className="block text-[11px] text-slate-500 font-sans mt-0.5">
                  Deshabilita o habilita el paso de lista del alumno.
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-700">/hoy / /reporte</span>
                <span className="block text-[11px] text-slate-500 font-sans mt-0.5">
                  Muestra las entradas válidas y reporte del día.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: First Scan & ID Cards */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Escaneo de Primera Vez y Generación de Carnets
              </h2>
              <p className="text-xs text-slate-500">
                Cómo dar de alta a los estudiantes al escanear o imprimir los carnets con código de barras.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800">A. Carnet Nuevo (Primera Vez):</div>
              <p className="leading-relaxed">
                Cuando un estudiante pasa un carnet no registrado por el lector del Arduino Uno, la pantalla del Kiosko web alerta inmediatamente y abre el modal de <strong>Alta Rápida</strong> con el código ya precargado. Solo escribes su nombre, año y sección y queda registrado.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800">B. Impresión de Carnets:</div>
              <p className="leading-relaxed">
                En la pestaña <strong>"Diseño de Carnets"</strong> puedes personalizar el logo, nombre del instituto y colores. Puedes imprimir un carnet individual o seleccionar por año o todos activos para generar la hoja lista para recortar o imprimir en credencial PVC.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
