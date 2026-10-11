import React, { useState } from 'react';
import { SystemSettings } from '../types';
import {
  Cpu,
  Wifi,
  Usb,
  Copy,
  Check,
  Code2,
  Terminal,
  Send,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface ArduinoHardwareHubProps {
  settings: SystemSettings;
}

export const ArduinoHardwareHub: React.FC<ArduinoHardwareHubProps> = ({ settings }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testCode, setTestCode] = useState('EST000123');
  const [testKey, setTestKey] = useState(settings.deviceKey);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'standard' | 'usb_host' | 'esp8266_direct'>('standard');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleTestEndpoint = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/scan?code=${encodeURIComponent(testCode)}&key=${encodeURIComponent(testKey)}&origin=Test-Hardware-Hub`);
      const data = await res.json();
      setTestResult({
        statusHttp: res.status,
        data,
      });
    } catch (err: any) {
      setTestResult({
        statusHttp: 500,
        error: err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Full Arduino Uno Sketch with SoftwareSerial + ESP-01 AT Firmware
  const arduinoSketchStandard = `/*
  ==============================================================
  SISTEMA DE ASISTENCIA ESCOLAR - ARDUINO UNO + ESP-01 (WIFI)
  ==============================================================
  Hardware:
    - Arduino Uno R3 (Autónomo: alimentado por fuente 9V/12V a la pared)
    - Pistola de código de barras USB conectada a USB Host Shield
    - Módulo WiFi ESP-01 (conecta a WiFi y transmite a la web)
    - Pin 8 (opcional): Buzzer / LED Verde (suena/enciende al confirmar asistencia)
    - Pin 9 (opcional): LED Rojo (alerta si el código no está registrado)
  
  Conexión ESP-01:
    - VCC: Fuente externa regulada de 3.3V (o adaptador ESP-01 de 5V)
    - GND: Tierra común con GND del Arduino
    - CH_PD / EN: 3.3V
    - ESP-01 RX: Divisor de voltaje desde Pin 3 del Uno (1k y 2k ohm)
    - ESP-01 TX: Pin 2 del Uno
*/

#include <SoftwareSerial.h>

// Pines para el ESP-01
SoftwareSerial espSerial(2, 3); // RX=Pin 2, TX=Pin 3

// Pines de retroalimentación física
const int PIN_BUZZER = 8;
const int PIN_LED_ROJO = 9;

// Credenciales WiFi y Servidor
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_CONTRASENA_WIFI";
const char* HOST_IP   = "${typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-lgv6giuatkfh5gukxtskxq-359813822709.us-west1.run.app'}"; 
const int   HOST_PORT = ${typeof window !== 'undefined' && window.location.port ? window.location.port : '80'}; // 80 para HTTP estándar, 443 para HTTPS con firmware AT SSL
const char* DEVICE_KEY = "${settings.deviceKey}";

// Buffer para código de barras
String barcodeBuffer = "";

void setup() {
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_ROJO, OUTPUT);
  
  Serial.begin(9600);      // Puerto serial para depuración o lector de barras
  espSerial.begin(9600);   // Comunicación con ESP-01 (9600 baud)
  
  delay(1000);
  Serial.println(F("--- SISTEMA AUTONOMO DE ASISTENCIA WIFI ---"));
  Serial.println(F("Iniciando conexion WiFi autonoma..."));
  
  initWifi();
}

void loop() {
  // Leer caracteres recibidos del lector de barras USB
  while (Serial.available()) {
    char c = (char)Serial.read();
    
    // Si la pistola de barras envía Enter (\\r o \\n), procesamos el carnet
    if (c == '\\r' || c == '\\n') {
      if (barcodeBuffer.length() > 0) {
        barcodeBuffer.trim();
        Serial.print(F("Carnet detectado por USB: "));
        Serial.println(barcodeBuffer);
        
        // El Arduino envia el codigo por su propio WiFi a la web
        enviarAsistencia(barcodeBuffer);
        
        barcodeBuffer = ""; // Reiniciar buffer
      }
    } else {
      barcodeBuffer += c;
    }
  }
}

// Configurar ESP-01 con comandos AT
void initWifi() {
  sendAT("AT", 1000);
  sendAT("AT+CWMODE=1", 1000); // Modo estación
  
  String cmdConnect = "AT+CWJAP=\\"" + String(WIFI_SSID) + "\\",\\"" + String(WIFI_PASS) + "\\"";
  Serial.println(F("Conectando al WiFi escolar..."));
  sendAT(cmdConnect, 7000);
  
  sendAT("AT+CIFSR", 2000); // Obtener IP asignada por el router
  
  // Beep de inicio: listo para funcionar autónomamente
  digitalWrite(PIN_BUZZER, HIGH);
  delay(150);
  digitalWrite(PIN_BUZZER, LOW);
  Serial.println(F("Arduino listo en la puerta. Esperando escaneos de carnets."));
}

// Enviar solicitud HTTP GET al servidor web
void enviarAsistencia(String codigo) {
  String cmdTcp = "AT+CIPSTART=\\"TCP\\",\\"" + String(HOST_IP) + "\\"," + String(HOST_PORT);
  if (!sendAT(cmdTcp, 3000)) {
    Serial.println(F("Error abriendo socket con el servidor web."));
    digitalWrite(PIN_LED_ROJO, HIGH);
    delay(500);
    digitalWrite(PIN_LED_ROJO, LOW);
    return;
  }
  
  // Construir peticion HTTP GET
  String httpRequest = "GET /api/scan?code=" + codigo + "&key=" + String(DEVICE_KEY) + "&origin=Arduino-WiFi HTTP/1.1\\r\\n" +
                       "Host: " + String(HOST_IP) + "\\r\\n" +
                       "Connection: close\\r\\n\\r\\n";
                       
  String cmdSend = "AT+CIPSEND=" + String(httpRequest.length());
  if (sendAT(cmdSend, 1500)) {
    espSerial.print(httpRequest);
    Serial.println(F("Peticion WiFi enviada a la nube."));
    
    // Tono de confirmacion en el Arduino
    digitalWrite(PIN_BUZZER, HIGH);
    delay(100);
    delay(1000);
  }
}

// Enviar comando AT y esperar respuesta
bool sendAT(String cmd, int timeout) {
  espSerial.println(cmd);
  long int time = millis();
  String response = "";
  
  while ((time + timeout) > millis()) {
    while (espSerial.available()) {
      char c = espSerial.read();
      response += c;
    }
  }
  
  Serial.print(F("RESP: "));
  Serial.println(response);
  return (response.indexOf("OK") != -1 || response.indexOf("ALREADY CONNECTED") != -1);
}`;

  // Arduino with USB Host Shield 2.0 (MAX3421E)
  const arduinoUsbHostSketch = `/*
  ==============================================================
  ARDUINO UNO + USB HOST SHIELD 2.0 + ESP-01 (WIFI)
  ==============================================================
  Requiere la librería "USB Host Shield Library 2.0" de Arduino
*/

#include <hidboot.h>
#include <usbhub.h>
#include <SoftwareSerial.h>

SoftwareSerial espSerial(2, 3); // ESP-01 RX/TX

USB     Usb;
HIDBoot<USB_HID_PROTOCOL_KEYBOARD>    HidKeyboard(&Usb);

String scannedCode = "";

class KbdRptParser : public KeyboardReportParser {
  protected:
    void OnKeyDown(uint8_t mod, uint8_t key) override;
};

void KbdRptParser::OnKeyDown(uint8_t mod, uint8_t key) {
  uint8_t ascii = OemToAscii(mod, key);
  if (ascii == 13 || ascii == 10) { // Enter detectado por la pistola de barras
    if (scannedCode.length() > 0) {
      Serial.print("Codigo leido por USB: ");
      Serial.println(scannedCode);
      // Enviar via ESP-01 al servidor
      scannedCode = "";
    }
  } else if (ascii) {
    scannedCode += (char)ascii;
  }
}

KbdRptParser Prs;

void setup() {
  Serial.begin(115200);
  espSerial.begin(9600);
  
  if (Usb.Init() == -1) {
    Serial.println("Error iniciando USB Host Shield");
  }
  
  HidKeyboard.SetReportParser(0, &Prs);
  Serial.println("Pistola de barras USB lista para escanear");
}

void loop() {
  Usb.Task(); // Procesar eventos USB del lector de barras
}`;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Integración de Hardware: Arduino Uno + ESP-01 WiFi
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Conexión del lector de código de barras USB, módulo WiFi ESP-01 y endpoints de la aplicación web.
        </p>
      </div>

      {/* Hardware Diagram & Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Usb className="w-4 h-4 text-blue-700" />
            <span>1. Módulo USB de Barras</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Puedes usar un <strong>USB Host Shield 2.0 (chip MAX3421E)</strong> para conectar cualquier pistola de código de barras USB estándar, o un módulo de escaneo serial (como GM65 o Grow) conectado a los pines RX/TX del Uno.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Wifi className="w-4 h-4 text-emerald-600" />
            <span>2. Módulo WiFi ESP-01 (AT)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            El ESP-01 utiliza firmware AT estándar (115200 o 9600 baud). Se comunica mediante <code>SoftwareSerial</code> con el Arduino Uno y despacha una llamada HTTP al servidor cada vez que se escanea un carnet.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>3. Alimentación y Niveles Lógicos</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            El pin 3.3V del Arduino Uno no entrega suficiente corriente (el ESP-01 necesita hasta 250mA en transmisión WiFi). Usa un regulador AMS1117-3.3V externo y un divisor resistivo (1k/2k) en el pin RX del ESP.
          </p>
        </div>
      </div>

      {/* Interactive Endpoint Tester */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Probador de Endpoint de Escaneo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Simula exactamente la llamada HTTP GET que realiza el Arduino Uno con el ESP-01.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código de Barra a Escanear
            </label>
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clave de Dispositivo (DEVICE_KEY)
            </label>
            <input
              type="text"
              value={testKey}
              onChange={(e) => setTestKey(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleTestEndpoint}
              disabled={isTesting}
              className="w-full py-2 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Probando...' : 'Enviar Petición de Prueba'}</span>
            </button>
          </div>
        </div>

        {/* Live URL Display */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 break-all">
          <span className="text-slate-400 select-none">GET </span>
          {window.location.origin}/api/scan?code={encodeURIComponent(testCode)}&key={encodeURIComponent(testKey)}
        </div>

        {testResult && (
          <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-[11px]">
              <span className="text-slate-400">HTTP Status: {testResult.statusHttp}</span>
              {testResult.data?.horaElSalvador && (
                <span className="text-blue-300 font-semibold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                  🇸🇻 Hora Servidor (El Salvador): {testResult.data.horaElSalvador} ({testResult.data.fechaElSalvador})
                </span>
              )}
            </div>
            <pre>{JSON.stringify(testResult.data || testResult.error, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Code Sketches Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-bold text-slate-800">
              Código Fuente para Arduino IDE (.ino)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/70 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveCodeTab('standard')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeCodeTab === 'standard'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Arduino Uno + ESP-01
              </button>
              <button
                onClick={() => setActiveCodeTab('usb_host')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeCodeTab === 'usb_host'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                USB Host Shield 2.0
              </button>
            </div>

            <button
              onClick={() =>
                copyToClipboard(
                  activeCodeTab === 'standard' ? arduinoSketchStandard : arduinoUsbHostSketch,
                  'sketch'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              {copiedSection === 'sketch' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[500px]">
          <pre>{activeCodeTab === 'standard' ? arduinoSketchStandard : arduinoUsbHostSketch}</pre>
        </div>
      </div>
    </div>
  );
};
