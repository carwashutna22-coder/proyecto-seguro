'use strict';

const express = require('express');
const router  = express.Router();

const { registrar }       = require('../controllers/registroController');
const { login, logout }   = require('../controllers/loginController');
const { guardarServicio } = require('../controllers/registroServicioController');
const { protegerAdmin }   = require('../middleware/auth');

const {
  sanitizeBody,
  validateServicio,
  validateRegistro,
  validateLogin,
  validateId,
  validateCorreoParam,
  validateEditarServicio
} = require('../middleware/security');

const supabase    = require('../src/lib/supabase');
const PDFDocument = require('pdfkit');

// ══════════════════════════════════════════════
// PÁGINAS PÚBLICAS
// ══════════════════════════════════════════════

router.get('/', (req, res) => res.render('inicio'));
router.get('/servicios', (req, res) => res.render('servicios'));
router.get('/ubicacion', (req, res) => res.render('ubicacion'));
router.get('/contacto', (req, res) => res.render('contacto'));

router.get('/servicio-express', (req, res) => res.render('servicio-express'));
router.get('/servicio-detallado', (req, res) => res.render('servicio-detallado'));
router.get('/servicio-completo', (req, res) => res.render('servicio-completo'));

router.get('/servicio-express-plus', (req, res) => res.render('servicio-express-plus'));
router.get('/servicio-detallado-premium', (req, res) => res.render('servicio-detallado-premium'));
router.get('/servicio-completo-plus', (req, res) => res.render('servicio-completo-plus'));

// ══════════════════════════════════════════════
// LOGIN / LOGOUT / REGISTRO
// ══════════════════════════════════════════════

router.get('/login', (req, res) => res.render('login'));
router.post('/login', sanitizeBody, validateLogin, login);
router.get('/logout', logout);

// 🔥 RUTA QUE FALTABA (REGISTRO)
router.get('/registro', protegerAdmin, (req, res) => res.render('registro'));
router.post('/registro', protegerAdmin, sanitizeBody, validateRegistro, registrar);

// ══════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════

router.get('/admin', protegerAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`nombre, correo, puestos ( nombre_puesto )`);

    if (error) throw error;

    const usuarios = data.map(u => ({
      nombre: u.nombre,
      correo: u.correo,
      nombre_puesto: u.puestos?.nombre_puesto || 'Sin puesto'
    }));

    res.render('admin', { usuarios });

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al cargar el panel.' });
  }
});

// ══════════════════════════════════════════════
// REGISTRO DE SERVICIO
// ══════════════════════════════════════════════

router.get('/registrodeservicio', protegerAdmin, (req, res) => res.render('registrodeservicio'));
router.post('/guardar', protegerAdmin, sanitizeBody, validateServicio, guardarServicio);

// ══════════════════════════════════════════════
// LISTA DE SERVICIOS
// ══════════════════════════════════════════════

router.get('/servicios-lista', protegerAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registro_servicio')
      .select(`
        id_registro,
        fecha,
        clientes!fk_registro_cliente ( nombreCliente ),
        vehiculos!fk_registro_vehiculo ( marcaVehiculo, modeloVehiculo ),
        servicios!fk_registro_servicio ( servicio ),
        control!fk_control_registro ( fechaServicio, horaEntrada, horaSalida ),
        estados_Vehiculo!fk_estado_registro ( estadoVehiculo )
      `);

    if (error) throw error;

    const servicios = data.map(r => ({
      _id: r.id_registro,
      nombreCliente: r.clientes?.nombreCliente || 'Sin cliente',
      marcaVehiculo: r.vehiculos?.marcaVehiculo || '',
      modeloVehiculo: r.vehiculos?.modeloVehiculo || '',
      servicio: r.servicios?.servicio || 'Sin servicio',
      fechaServicio: r.control?.[0]?.fechaServicio || r.fecha || 'Sin fecha',
      estadoVehiculo: r.estados_Vehiculo?.[0]?.estadoVehiculo || 'Sin estado'
    }));

    res.render('servicios-lista', { servicios });

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al cargar servicios.' });
  }
});

// ══════════════════════════════════════════════
// CONSULTAR SERVICIO
// ══════════════════════════════════════════════

router.get('/consultar/:id', protegerAdmin, validateId, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registro_servicio')
      .select(`*`)
      .eq('id_registro', req.params.id)
      .single();

    if (error) throw error;

    res.render('servicio-turno', { servicio: data });

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al cargar el servicio.' });
  }
});

// ══════════════════════════════════════════════
// EDITAR / ELIMINAR / PDF (SIN CAMBIOS)
// ══════════════════════════════════════════════

// 👉 Aquí puedes dejar TODO lo demás EXACTAMENTE como ya lo tienes
// (editar-servicio, eliminar, ticket, etc.)
// porque eso ya te estaba funcionando bien

module.exports = router;