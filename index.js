'use strict';

require('dotenv').config();

const express = require('express');
const session = require('express-session');
//const { securityHeaders } = require('./middleware/security');

const app  = express();
const port = process.env.PORT || 5000;

// ── Archivos estáticos
app.use(express.static('public'));

// ── Motor de plantillas
app.set('view engine', 'pug');

// ── Parseo de body (limit para prevenir DoS por body grande)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// ── Headers de seguridad HTTP (XSS, Clickjacking, MIME sniffing, CSP)
//app.use(securityHeaders);

// ── Sesión segura
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambiar_este_secreto_en_produccion_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,          // Impide acceso JS a la cookie
    secure: false,           // Cambiar a true en producción con HTTPS
    sameSite: 'strict',      // Protección CSRF básica
    maxAge: 1000 * 60 * 60 * 4  // 4 horas
  }
}));

// ── Rutas
//app.use('/', require('./routes/router'));

// ── Manejo de errores 404
app.use((req, res) => {
  res.status(404).render('error', { mensaje: 'Página no encontrada.' });
});

// ── Manejo de errores globales
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.message);
  res.status(500).render('error', { mensaje: 'Error interno del servidor.' });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});