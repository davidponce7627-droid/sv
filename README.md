# Guía de Enlace: Sistema de Asistencia Estudiantil con Arduino Uno, ESP-01 WiFi y Bot de Telegram

Este documento explica paso a paso cómo conectar tu hardware (Arduino Uno + Lector de Código de Barras USB + Módulo WiFi ESP-01), vincularlo a esta aplicación web y utilizar el Bot de Telegram como **Super Administrador** para gestionar estudiantes, carnets y asistencias desde el teléfono móvil.

---

## 1. Arquitectura del Sistema (100% Autónoma)

```
[ Lector USB de Barras ] 
         │ (Cable USB)
         ▼
[ Arduino Uno R3 ] (Alimentación 9V/12V externa)
         │ (SoftwareSerial Pines 2 y 3)
         ▼
[ Módulo WiFi ESP-01 ] ──(WiFi local)──> [ Servidor Web en la Nube ]
                                                  │
                                                  ▼
                                      [ Bot de Telegram + Web Kiosko ]
```

El Arduino Uno funciona de manera independiente en la entrada o puerta escolar. No requiere cables conectados a ninguna PC.

---

## 2. Enlace del Arduino Uno a la Web

### 2.1. Endpoints de la Aplicación Web

La aplicación web expone dos rutas preparadas para recibir peticiones del módulo ESP-01:

- **Endpoint Estándar**:
  ```http
  GET /api/scan?code=CODIGO&key=TU_DEVICE_KEY&origin=Arduino-WiFi
  ```
- **Endpoint de Compatibilidad (Google Apps Script)**:
  ```http
  GET /exec?action=scan&code=CODIGO&key=TU_DEVICE_KEY
  ```

### 2.2. Parámetros de Configuración en el Código Arduino (.ino)

Abre el archivo `.ino` incluido en la pestaña **"Arduino & ESP-01"** en el Arduino IDE y ajusta estas variables:

```cpp
// 1. Red WiFi de tu institución educativa o hotspot móvil:
const char* WIFI_SSID = "NOMBRE_DE_TU_RED_WIFI";
const char* WIFI_PASS = "CONTRASENA_DE_TU_WIFI";

// 2. Servidor web (Host):
const char* HOST_IP   = "ais-dev-lgv6giuatkfh5gukxtskxq-359813822709.us-west1.run.app";
const int   HOST_PORT = 80; // o 443 según firmware

// 3. Clave de seguridad del dispositivo (DEVICE_KEY):
const char* DEVICE_KEY = "ARDUINO_SECRET_KEY_2026";
```

### 2.3. Diagrama de Pines en el Arduino Uno

| Componente | Pin Arduino Uno | Notas de Conexión |
| :--- | :--- | :--- |
| **ESP-01 TX** | Pin 2 (RX Arduino) | Señal directa de 3.3V al pin digital de entrada del Uno. |
| **ESP-01 RX** | Pin 3 (TX Arduino) | **Importante**: Usar divisor de tensión (1kΩ y 2kΩ) para bajar de 5V a 3.3V. |
| **ESP-01 VCC** | Fuente 3.3V externa | El ESP-01 consume hasta 250mA. Usar regulador AMS1117-3.3V. |
| **ESP-01 GND** | GND común | Conectar a la tierra (GND) del Arduino. |
| **ESP-01 CH_PD/EN** | 3.3V | Mantener en nivel alto para habilitar el chip. |
| **Lector USB** | Puerto USB Host Shield | O puerto serial de módulo lector en pines RX/TX. |
| **Buzzer / LED Verde (opcional)** | Pin 8 | Emite pitido de confirmación en la puerta al validar entrada. |
| **LED Rojo (opcional)** | Pin 9 | Enciende si el código no está registrado en el sistema. |

---

## 3. Bot de Telegram: Super Administrador Total

El bot de Telegram tiene control total del sistema sin necesidad de abrir la computadora.

### 3.1. Crear el Bot en Telegram
1. En Telegram, busca `@BotFather`.
2. Envía el comando `/newbot`.
3. Asigna un nombre (ej. *Asistencia Escolar Bot*) y un usuario que termine en `bot` (ej. *ControlAsistencia2026_bot*).
4. Copia el **Token HTTP API** que te entrega `@BotFather`.
5. Obtén tu ID numérico de Telegram abriendo `@userinfobot` y copiando tu `Id`.

### 3.2. Configurar en la Web
1. En la aplicación web, ve a la pestaña **"Bot Telegram"**.
2. Pega tu **Token del Bot** y tu **ID de Administrador (ADMIN_IDS)**.
3. Guarda los cambios.

### 3.3. Configurar el Webhook en Telegram
Para que Telegram redirija los mensajes directamente a la web, ejecuta en tu navegador o terminal:
```bash
curl -X POST "https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook?url=https://ais-dev-lgv6giuatkfh5gukxtskxq-359813822709.us-west1.run.app/api/bot/webhook"
```

---

## 4. Comandos de Administración del Bot

Desde el chat privado con tu bot en Telegram puedes ejecutar:

| Comando | Función de Super Administrador |
| :--- | :--- |
| `/start` o `/menu` | Despliega el menú principal de administración. |
| `/alta CODIGO\|NOMBRE\|AÑO\|ESP\|SEC\|CORREO` | Registra a un nuevo estudiante en el padrón escolar al instante. |
| `/buscar [texto]` | Busca estudiantes por nombre, apellido o código. |
| `/carnet [código]` | Muestra la información de credencial del alumno. |
| `/carnets TODOS` o `/carnets 3°` | Lista los estudiantes listos para impresión de carnets. |
| `/baja [código]` | Desactiva a un estudiante (no podrá pasar lista). |
| `/activar [código]` | Reactiva a un estudiante inactivo. |
| `/eliminar [código]` | Elimina definitivamente a un estudiante de la base de datos. |
| `/hoy` | Resumen de asistencias válidas del día actual. |
| `/reporte` | Reporte completo de entradas, duplicados y alertas. |
| `/limpiar` | Borra el registro de asistencias del día. |
| `/reiniciar` | **Restablece la base de datos a CERO** (0 alumnos, 0 asistencias). |
| `/estado` | Muestra el estado del servidor, clave de Arduino y estadísticas. |
| `/ayuda` | Lista de ayuda y ejemplos prácticos. |

### Ejemplo para registrar a un nuevo estudiante:
```text
/alta EST0001|Ana Beatriz Pérez|3°|Desarrollo de Software|A|ana.perez@escuela.edu
```

---

## 5. Flujo de Trabajo al Escanear un Carnet

1. **Si el carnet ya está registrado**:
   - El Arduino envía el código por WiFi al enlace `/api/scan`.
   - La web suena con un tono de entrada exitosa (`C5 -> G5`).
   - Aparece la tarjeta del estudiante con su foto, año, especialidad y sección.
   - El bot de Telegram notifica automáticamente al administrador.
   - El Arduino pita localmente en el pin 8.

2. **Si es la primera vez que se escanea el código (código nuevo)**:
   - La web detecta `UNKNOWN_CODE` y despliega la ventana **Alta Rápida de Estudiante**, precargando el código escaneado.
   - Ingresas el nombre y grado en 10 segundos y pulsas **"Guardar y Pasar Lista"**.
   - Queda guardado en el padrón para siempre y la asistencia se marca de inmediato.

3. **Protección contra duplicados**:
   - Si el estudiante pasa el carnet dos veces seguidas en menos de 60 segundos, el sistema evita duplicar la fila y lo marca como `DUPLICADO`.

---

## 6. Generación e Impresión de Carnets

1. Dirígete a la pestaña **"Diseño de Carnets"**.
2. Personaliza el nombre de tu institución y los colores corporativos.
3. El carnet se genera en formato vertical oficial (54 × 85.6 mm, norma CR80) con código de barras **Code 128**.
4. Puedes imprimir un carnet individual o seleccionar **"Por Año"** o **"Todos Activos"** y hacer clic en **"Imprimir Carnet(s)"** para imprimir la cuadrícula en papel o tarjetas PVC.
