# GymAdmin PWA — Instrucciones de instalación

## Estructura del proyecto
```
gymadmin/
├── index.html       ← App principal
├── manifest.json    ← Config PWA
├── sw.js            ← Service Worker (offline)
├── Code.gs          ← Google Apps Script (copiar en Google)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

---

## PASO 1 — Google Apps Script (5 minutos)

1. Abrí **Google Sheets** en sheets.google.com → creá una hoja nueva
2. Menú → **Extensiones → Apps Script**
3. Borrá el código que hay y pegá el contenido de `Code.gs`
4. Guardá (Ctrl+S)
5. Clic en **Implementar → Nueva implementación**
   - Tipo: **Aplicación web**
   - Descripción: `GymAdmin v1`
   - Ejecutar como: **Yo (tu email)**
   - Quién tiene acceso: **Cualquier persona**
6. Clic **Implementar** → Autorizá los permisos
7. **Copiá la URL** que aparece (empieza con `https://script.google.com/macros/s/...`)

> ⚠️ Guardá esa URL, la vas a necesitar en la app.

---

## PASO 2 — Subir a Netlify (2 minutos)

### Opción A — Drag & Drop (más fácil)
1. Entrá a **netlify.com** → Sign up gratis con GitHub o email
2. En el dashboard → arrastrá la carpeta `gymadmin/` a la zona de drop
3. Netlify te da una URL automática tipo `https://nombre-aleatorio.netlify.app`
4. ¡Listo! Tu app ya tiene HTTPS y es una PWA instalable

### Opción B — GitHub + Netlify (recomendado para actualizaciones)
1. Subí la carpeta como repositorio en **github.com**
2. En Netlify → **Add new site → Import from Git**
3. Conectá el repo → Deploy automático

---

## PASO 3 — Configurar la URL en la app

1. Abrí la app en el navegador
2. Ingresá con usuario/contraseña
3. Aparece la pantalla de **Configuración inicial**
4. Pegá la URL de Apps Script del Paso 1
5. Clic **GUARDAR Y CONECTAR**

> La URL se guarda en el dispositivo. Cada dispositivo que use la app necesita hacer este paso una vez.

---

## Instalar como app en el celular

### Android (Chrome)
- Abrí la URL en Chrome
- Aparece un banner "Agregar a pantalla de inicio"
- O menú ⋮ → "Instalar aplicación"

### iPhone (Safari)
- Abrí la URL en Safari
- Compartir → "Agregar a pantalla de inicio"

---

## Usuarios por defecto

| Usuario    | Contraseña    |
|------------|---------------|
| admin      | gym2024       |
| recepcion  | recepcion123  |

Para cambiar contraseñas o agregar usuarios, editá el objeto `USERS` al inicio del `<script>` en `index.html`.

---

## Cómo funciona la sincronización

```
App (localStorage)  ←→  Google Apps Script  ←→  Google Sheets
```

- **Offline**: Los datos se guardan en el dispositivo automáticamente
- **Online**: Se sincronizan al Sheet cuando hay conexión
- **Background sync**: Si guardás sin conexión, se sincroniza solo cuando vuelve la red
- **Multi-dispositivo**: Todos los dispositivos pueden leer del Sheet al cargar

### Hojas que crea automáticamente en Google Sheets
- **Socios** — todos los registros de membresías
- **Stock** — inventario de productos
- **Ventas** — historial de ventas de tienda

---

## Personalizar usuarios y contraseñas

En `index.html`, buscá esta sección al inicio del script:

```javascript
const USERS = {
  'admin':     'gym2024',
  'recepcion': 'recepcion123'
  // Agregá más: 'nombre': 'contraseña'
};
```

---

## Soporte
Cualquier duda, revisá que:
- La URL de Apps Script esté bien copiada (sin espacios)
- El Apps Script esté publicado como "Cualquier persona" 
- La app esté en HTTPS (Netlify lo hace automáticamente)

---

## Módulo de Check-in con Huella Dactilar

### Requisitos del celular
- Android 9+ con sensor de huella (o iPhone con Face ID / Touch ID)
- Chrome 70+ o Safari 14+
- La app debe estar en HTTPS (Netlify lo hace automáticamente)

### Cómo configurar

**En el celular de recepción (modo kiosco):**
1. Abrí `https://tu-app.netlify.app/checkin.html` en Chrome
2. Pegá la misma URL de Apps Script que usaste en la app principal
3. En Chrome Android: menú ⋮ → "Agregar a pantalla de inicio"
4. Abrí desde el ícono en pantalla de inicio → queda en pantalla completa

**Registrar la huella de un socio (una sola vez por socio):**
1. En la pantalla de check-in, tocá el ícono ⚙ (abajo a la derecha)
2. Buscá al socio por nombre
3. Tocá "REGISTRAR HUELLA" → el socio apoya el dedo
4. ¡Listo! La huella queda guardada en ese dispositivo

**Uso diario:**
- El socio llega al gym, apoya el dedo en el celular de recepción
- La pantalla muestra en grande: ✓ nombre + "ACCESO PERMITIDO" (verde) o ✗ "ACCESO DENEGADO" (rojo)
- Vuelve automáticamente a la pantalla de espera

### ¿Qué pasa si cambian el celular?
Las huellas quedan guardadas en el dispositivo por seguridad (así funciona WebAuthn). Si cambiás el celular, hay que re-registrar las huellas de los socios. Los datos de socios siguen en Google Sheets, solo hay que volver a registrar las huellas.
