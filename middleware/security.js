'use strict';

// ============================================================
//  MIDDLEWARE DE SEGURIDAD - UTNACAR WASH
// ============================================================

const CURRENT_YEAR = new Date().getFullYear();

// ── 1. Sanitizar texto ──
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;')
    .trim();
}

// ── 2. Sanitizar body ──
function sanitizeBody(req, res, next) {
  const CAMPOS_EXCLUIDOS = ['password', 'confirmPassword'];
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        if (!CAMPOS_EXCLUIDOS.includes(key)) {
          req.body[key] = req.body[key].trim();
          const dangerous = /(<script|javascript:|on\w+=|--\s*$|;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE|TRUNCATE)\b)/i;
          if (dangerous.test(req.body[key])) {
            return res.status(400).render('error', {
              mensaje: 'Se detectó contenido no permitido en el formulario.'
            });
          }
        }
      }
    }
  }
  next();
}

// ── 3. Validadores ──
function isOnlyLetters(str) {
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(str);
}

function isPhoneNumber(str) {
  return /^\d{1,10}$/.test(str);
}

function isPositiveInt(str) {
  return /^\d+$/.test(str);
}

function isValidYear(str) {
  const n = parseInt(str, 10);
  return Number.isInteger(n) && n >= 1950 && n <= CURRENT_YEAR;
}

function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [year, month, day] = str.split('-').map(Number);
  if (year < 1950 || year > CURRENT_YEAR) return false;
  if (month < 1 || month > 12) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function isValidTime(str) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
}

function isAlphaNumericBasic(str) {
  return /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-]+$/.test(str);
}

function isValidPrice(str) {
  return /^\d{1,6}(\.\d{1,2})?$/.test(str);
}

/**
 * Validación de correo estricta:
 * - Local: letras a-z/A-Z, dígitos, punto, guion, guion_bajo
 *   No empieza/termina con punto/guion/guion_bajo, sin dobles puntos
 * - Dominio: etiquetas con letras/dígitos/guion (no empieza/termina con guion)
 * - TLD: mínimo 2 letras, no puede ser todo números
 */
function isValidEmail(str) {
  if (!str || str.length > 254) return false;
  const at = str.indexOf('@');
  if (at < 1 || at === str.length - 1) return false;
  const local = str.slice(0, at);
  const domain = str.slice(at + 1);

  // Local: 1-64 chars; solo letras, dígitos, punto, guion, guion_bajo
  // No empieza/termina con . _ -; sin secuencias dobles
  if (local.length < 1 || local.length > 64) return false;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._\-]*[a-zA-Z0-9]$/.test(local) && !/^[a-zA-Z0-9]$/.test(local)) return false;
  if (/\.{2,}/.test(local) || /_{2,}/.test(local) || /-{2,}/.test(local)) return false;
  if (!/^[a-zA-Z0-9._\-]+$/.test(local)) return false;

  // Dominio: etiquetas separadas por punto
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (label.length < 1 || label.length > 63) return false;
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$/.test(label)) return false;
  }
  // TLD: mínimo 2 chars, debe contener al menos una letra
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/[a-zA-Z]/.test(tld)) return false;

  return true;
}

/** Placas: solo alfanumérico, exactamente 7 u 8 caracteres */
function isValidPlate(str) {
  return /^[a-zA-Z0-9]{7,8}$/.test(str);
}

/** Observaciones: solo letras, números, punto, coma, punto y coma, espacio */
function isValidObservations(str) {
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9.,;\s]*$/.test(str);
}

// ── 4. Validar formulario de SERVICIO ──
function validateServicio(req, res, next) {
  const {
    nombreCliente, telefonoCliente,
    marcaVehiculo, modeloVehiculo, anioVehiculo,
    colorVehiculo, placasVehiculo,
    precio,
    fechaServicio, horaEntrada, horaSalida,
    observaciones, mensajeWhatsapp
  } = req.body;

  const errores = [];

  if (!nombreCliente || !isOnlyLetters(nombreCliente) || nombreCliente.length > 80) {
    errores.push('Nombre del cliente: solo letras, máximo 80 caracteres.');
  }
  if (!telefonoCliente || !isPhoneNumber(telefonoCliente)) {
    errores.push('Teléfono: solo números, máximo 10 dígitos.');
  }
  if (!marcaVehiculo || !isAlphaNumericBasic(marcaVehiculo) || marcaVehiculo.length > 50) {
    errores.push('Marca del vehículo: solo letras y números, máximo 50 caracteres.');
  }
  if (!modeloVehiculo || !isAlphaNumericBasic(modeloVehiculo) || modeloVehiculo.length > 50) {
    errores.push('Modelo del vehículo: solo letras y números, máximo 50 caracteres.');
  }
  if (!anioVehiculo || !isValidYear(anioVehiculo)) {
    errores.push(`Año del vehículo: debe ser entre 1950 y ${CURRENT_YEAR}.`);
  }
  if (colorVehiculo && (!isOnlyLetters(colorVehiculo) || colorVehiculo.length > 30)) {
    errores.push('Color: solo letras, máximo 30 caracteres.');
  }
  // Placas: 7 u 8 caracteres alfanuméricos
  if (!placasVehiculo || !isValidPlate(placasVehiculo)) {
    errores.push('Placas: exactamente 7 u 8 caracteres alfanuméricos.');
  }
  if (!precio || !isValidPrice(precio)) {
    errores.push('Precio: solo números positivos (máx. 6 enteros y 2 decimales).');
  }
  if (!fechaServicio || !isValidDate(fechaServicio)) {
    errores.push(`Fecha del servicio: formato válido, entre 1950 y ${CURRENT_YEAR}.`);
  }
  if (!horaEntrada || !isValidTime(horaEntrada)) {
    errores.push('Hora de entrada: formato HH:MM (00:00 a 23:59).');
  }
  if (horaSalida && !isValidTime(horaSalida)) {
    errores.push('Hora de salida: formato HH:MM (00:00 a 23:59).');
  }
  // Observaciones: solo letras, números, puntos, comas, punto y coma, espacios
  if (observaciones && (!isValidObservations(observaciones) || observaciones.length > 200)) {
    errores.push('Observaciones: solo letras, números, puntos, comas y espacios (máx. 200).');
  }
  // Mensaje WhatsApp igual restricción
  if (mensajeWhatsapp && (!isValidObservations(mensajeWhatsapp) || mensajeWhatsapp.length > 200)) {
    errores.push('Mensaje personalizado: solo letras, números, puntos, comas y espacios (máx. 200).');
  }

  if (errores.length > 0) {
    return res.status(400).render('error', { mensaje: errores.join(' | ') });
  }
  next();
}

// ── 5. Validar formulario de REGISTRO ──
function validateRegistro(req, res, next) {
  const { nombre, correo, password } = req.body;
  const errores = [];

  if (!nombre || !isOnlyLetters(nombre) || nombre.length > 80) {
    errores.push('Nombre: solo letras, máximo 80 caracteres.');
  }

  // Correo con validación estricta
  if (!correo || !isValidEmail(correo.toLowerCase())) {
    errores.push('Correo: formato inválido. Use solo letras, dígitos, punto, guion o guion_bajo antes del @; dominio válido.');
  }

  // Contraseña: min 8 para nuevos registros
  if (!password || password.length < 8 || password.length > 50) {
    errores.push('Contraseña: debe tener entre 8 y 50 caracteres.');
  }

  if (errores.length > 0) {
    return res.status(400).render('error', { mensaje: errores.join(' | ') });
  }
  next();
}

// ── 6. Validar formulario de LOGIN ──
// NOTA: contraseñas actuales pueden ser de 3 chars, no forzamos min aquí
function validateLogin(req, res, next) {
  const { correo, password } = req.body;

  if (!correo || !isValidEmail(correo.toLowerCase())) {
    return res.status(400).render('error', { mensaje: 'Correo con formato inválido.' });
  }
  // Login permite contraseñas cortas (registros previos pueden tener 3 chars)
  if (!password || password.length < 1 || password.length > 50) {
    return res.status(400).render('error', { mensaje: 'Contraseña inválida.' });
  }
  next();
}

// ── 7. Validar parámetro :id ──
function validateId(req, res, next) {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const intRegex = /^\d+$/;
  if (!id || (!uuidRegex.test(id) && !intRegex.test(id))) {
    return res.status(400).render('error', { mensaje: 'Identificador inválido.' });
  }
  next();
}

// ── 8. Validar parámetro :correo ──
function validateCorreoParam(req, res, next) {
  const { correo } = req.params;
  if (!correo || !isValidEmail(decodeURIComponent(correo).toLowerCase())) {
    return res.status(400).render('error', { mensaje: 'Parámetro de correo inválido.' });
  }
  next();
}

// ── 9. Validar edición de servicio ──
function validateEditarServicio(req, res, next) {
  const { id_cliente, id_vehiculo, id_servicio } = req.body;
  const intRegex = /^\d+$/;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function validId(v) {
    return v && (intRegex.test(v) || uuidRegex.test(v));
  }
  if (!validId(id_cliente) || !validId(id_vehiculo) || !validId(id_servicio)) {
    return res.status(400).render('error', { mensaje: 'IDs internos inválidos.' });
  }
  validateServicio(req, res, next);
}

// ── 10. Headers de seguridad HTTP ──
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self';"
  );
  next();
}

module.exports = {
  sanitizeBody,
  sanitizeText,
  validateServicio,
  validateRegistro,
  validateLogin,
  validateId,
  validateCorreoParam,
  validateEditarServicio,
  securityHeaders,
  isValidEmail,
  isValidDate,
  isValidYear,
  isPhoneNumber,
  isOnlyLetters,
  isValidPlate,
  isValidObservations,
  CURRENT_YEAR
};
