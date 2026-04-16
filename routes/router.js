'use strict';

const express = require('express');
const router  = express.Router();

const { registrar }       = require('../controllers/registroController');
const { login, logout }   = require('../controllers/loginController');
const { guardarServicio }  = require('../controllers/registroServicioController');
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

router.get('/',                    (req, res) => res.render('inicio'));
router.get('/servicios',           (req, res) => res.render('servicios'));
router.get('/ubicacion',           (req, res) => res.render('ubicacion'));
router.get('/contacto',            (req, res) => res.render('contacto'));
router.get('/servicio-express',    (req, res) => res.render('servicio-express'));
router.get('/servicio-detallado',  (req, res) => res.render('servicio-detallado'));
router.get('/servicio-completo',   (req, res) => res.render('servicio-completo'));
router.get('/servicio-express-plus',      (req, res) => res.render('servicio-express-plus'));
router.get('/servicio-detallado-premium', (req, res) => res.render('servicio-detallado-premium'));
router.get('/servicio-completo-plus',     (req, res) => res.render('servicio-completo-plus'));

// ══════════════════════════════════════════════
// LOGIN / LOGOUT / REGISTRO DE USUARIO
// ══════════════════════════════════════════════

router.get('/login',  (req, res) => res.render('login'));
router.post('/login', sanitizeBody, validateLogin, login);
router.get('/logout', logout);

// ✅ TEMPORAL (sin protección)
router.get('/registro', (req, res) => res.render('registro'));
router.post('/registro', sanitizeBody, validateRegistro, registrar);

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
router.post('/guardar',           protegerAdmin, sanitizeBody, validateServicio, guardarServicio);

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
      _id:            r.id_registro,
      nombreCliente:  r.clientes?.nombreCliente || 'Sin cliente',
      marcaVehiculo:  r.vehiculos?.marcaVehiculo || '',
      modeloVehiculo: r.vehiculos?.modeloVehiculo || '',
      servicio:       r.servicios?.servicio || 'Sin servicio',
      fechaServicio:  r.control?.[0]?.fechaServicio || r.fecha || 'Sin fecha',
      estadoVehiculo: r.estados_Vehiculo?.[0]?.estadoVehiculo || 'Sin estado'
    }));

    res.render('servicios-lista', { servicios });

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al cargar servicios.' });
  }
});

// ══════════════════════════════════════════════
// CONSULTAR SERVICIO (turno)
// ══════════════════════════════════════════════

router.get('/consultar/:id', protegerAdmin, validateId, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registro_servicio')
      .select(`
        id_registro,
        clientes!fk_registro_cliente ( nombreCliente ),
        vehiculos!fk_registro_vehiculo ( marcaVehiculo, modeloVehiculo, placasVehiculo ),
        servicios!fk_registro_servicio ( servicio ),
        control!fk_control_registro ( fechaServicio, horaEntrada, horaSalida ),
        estados_Vehiculo!fk_estado_registro ( estadoVehiculo )
      `)
      .eq('id_registro', req.params.id)
      .single();

    if (error) throw error;

    const servicio = {
      _id:            data.id_registro,
      nombreCliente:  data.clientes?.nombreCliente || 'Sin cliente',
      marcaVehiculo:  data.vehiculos?.marcaVehiculo || '',
      modeloVehiculo: data.vehiculos?.modeloVehiculo || '',
      placasVehiculo: data.vehiculos?.placasVehiculo || '',
      servicio:       data.servicios?.servicio || 'Sin servicio',
      fechaServicio:  data.control?.[0]?.fechaServicio || 'Sin fecha',
      horaEntrada:    data.control?.[0]?.horaEntrada || 'Sin hora',
      horaSalida:     data.control?.[0]?.horaSalida || 'Sin hora',
      estadoVehiculo: data.estados_Vehiculo?.[0]?.estadoVehiculo || 'Sin estado'
    };

    res.render('servicio-turno', { servicio });

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al cargar el servicio.' });
  }
});

// ══════════════════════════════════════════════
// EDITAR SERVICIO
// ══════════════════════════════════════════════

router.get('/editar-servicio/:id', protegerAdmin, validateId, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registro_servicio')
      .select(`
        id_registro,
        clientes!fk_registro_cliente ( id_cliente, nombreCliente, telefonoCliente ),
        vehiculos!fk_registro_vehiculo ( id_vehiculo, marcaVehiculo, modeloVehiculo, anioVehiculo, colorVehiculo, placasVehiculo, tipoVehiculo ),
        servicios!fk_registro_servicio ( id_servicio, servicio, precio ),
        control!fk_control_registro ( fechaServicio, horaEntrada, horaSalida ),
        estados_Vehiculo!fk_estado_registro ( estadoVehiculo, observaciones )
      `)
      .eq('id_registro', req.params.id)
      .single();

    if (error) throw error;

    const servicio = {
      _id: data.id_registro,
      id_cliente:  data.clientes?.id_cliente,
      id_vehiculo: data.vehiculos?.id_vehiculo,
      id_servicio: data.servicios?.id_servicio,
      nombreCliente:  data.clientes?.nombreCliente  || '',
      telefonoCliente: data.clientes?.telefonoCliente || '',
      marcaVehiculo:  data.vehiculos?.marcaVehiculo  || '',
      modeloVehiculo: data.vehiculos?.modeloVehiculo || '',
      anioVehiculo:   data.vehiculos?.anioVehiculo   || '',
      colorVehiculo:  data.vehiculos?.colorVehiculo  || '',
      placasVehiculo: data.vehiculos?.placasVehiculo || '',
      tipoVehiculo:   data.vehiculos?.tipoVehiculo   || '',
      servicio:       data.servicios?.servicio  || '',
      precio:         data.servicios?.precio    || '',
      fechaServicio:  data.control?.[0]?.fechaServicio || '',
      horaEntrada:    data.control?.[0]?.horaEntrada   || '',
      horaSalida:     data.control?.[0]?.horaSalida    || '',
      estadoVehiculo: data.estados_Vehiculo?.[0]?.estadoVehiculo || '',
      observaciones:  data.estados_Vehiculo?.[0]?.observaciones  || ''
    };

    res.render('editar-servicio', { servicio });

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al cargar el servicio.' });
  }
});

router.post('/editar-servicio/:id', protegerAdmin, validateId, sanitizeBody, validateEditarServicio, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_cliente, id_vehiculo, id_servicio,
      nombreCliente, telefonoCliente,
      marcaVehiculo, modeloVehiculo, anioVehiculo, colorVehiculo, placasVehiculo, tipoVehiculo,
      servicio, precio,
      estadoVehiculo, observaciones,
      fechaServicio, horaEntrada, horaSalida
    } = req.body;

    const { sanitizeText } = require('../middleware/security');

    await supabase.from('clientes')
      .update({ nombreCliente: sanitizeText(nombreCliente), telefonoCliente: telefonoCliente.replace(/\D/g,'').slice(0,10) })
      .eq('id_cliente', id_cliente);

    await supabase.from('vehiculos')
      .update({
        marcaVehiculo: sanitizeText(marcaVehiculo),
        modeloVehiculo: sanitizeText(modeloVehiculo),
        anioVehiculo: parseInt(anioVehiculo, 10),
        colorVehiculo: sanitizeText(colorVehiculo || ''),
        placasVehiculo: sanitizeText(placasVehiculo).toUpperCase(),
        tipoVehiculo
      })
      .eq('id_vehiculo', id_vehiculo);

    await supabase.from('servicios')
      .update({ servicio, precio: parseFloat(precio) })
      .eq('id_servicio', id_servicio);

    await supabase.from('control')
      .update({ fechaServicio, horaEntrada, horaSalida: horaSalida || null })
      .eq('id_registro', id);

    await supabase.from('estados_Vehiculo')
      .update({ estadoVehiculo, observaciones: sanitizeText(observaciones || '').slice(0, 200) })
      .eq('id_registro', id);

    res.redirect('/servicios-lista');

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al actualizar el servicio.' });
  }
});

// ══════════════════════════════════════════════
// ELIMINAR SERVICIO
// ══════════════════════════════════════════════

router.get('/eliminar-servicio/:id', protegerAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const { data } = await supabase
      .from('registro_servicio')
      .select('id_cliente, id_vehiculo, id_servicio')
      .eq('id_registro', id)
      .single();

    if (!data) return res.render('error', { mensaje: 'Servicio no encontrado.' });

    await supabase.from('WHATSAPP').delete().eq('id_registro', id);
    await supabase.from('estados_Vehiculo').delete().eq('id_registro', id);
    await supabase.from('control').delete().eq('id_registro', id);
    await supabase.from('registro_servicio').delete().eq('id_registro', id);
    await supabase.from('vehiculos').delete().eq('id_vehiculo', data.id_vehiculo);
    await supabase.from('clientes').delete().eq('id_cliente', data.id_cliente);
    await supabase.from('servicios').delete().eq('id_servicio', data.id_servicio);

    res.redirect('/servicios-lista');

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al eliminar el servicio.' });
  }
});

// ══════════════════════════════════════════════
// TICKET PDF
// ══════════════════════════════════════════════

router.get('/ticket/:id', protegerAdmin, validateId, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registro_servicio')
      .select(`
        id_registro,
        clientes!fk_registro_cliente ( nombreCliente, telefonoCliente ),
        vehiculos!fk_registro_vehiculo ( marcaVehiculo, modeloVehiculo, anioVehiculo, colorVehiculo, placasVehiculo, tipoVehiculo ),
        servicios!fk_registro_servicio ( servicio, precio ),
        control!fk_control_registro ( fechaServicio, horaEntrada, horaSalida ),
        estados_Vehiculo!fk_estado_registro ( estadoVehiculo, observaciones )
      `)
      .eq('id_registro', req.params.id)
      .single();

    if (error) throw error;

    const doc = new PDFDocument({ margin: 50, size: [300, 500] });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${req.params.id}.pdf`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('AUTO LAVADO', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Ticket de Servicio', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('CLIENTE');
    doc.fontSize(10).font('Helvetica').text(`Nombre: ${data.clientes?.nombreCliente || '-'}`);
    doc.text(`Teléfono: ${data.clientes?.telefonoCliente || '-'}`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('VEHÍCULO');
    doc.fontSize(10).font('Helvetica').text(`${data.vehiculos?.marcaVehiculo} ${data.vehiculos?.modeloVehiculo} ${data.vehiculos?.anioVehiculo}`);
    doc.text(`Color: ${data.vehiculos?.colorVehiculo || '-'}`);
    doc.text(`Placas: ${data.vehiculos?.placasVehiculo || '-'}`);
    doc.text(`Tipo: ${data.vehiculos?.tipoVehiculo || '-'}`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('SERVICIO');
    doc.fontSize(10).font('Helvetica').text(`Tipo: ${data.servicios?.servicio || '-'}`);
    doc.text(`Precio: $${data.servicios?.precio || '0'}`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('CONTROL');
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${data.control?.[0]?.fechaServicio || '-'}`);
    doc.text(`Hora entrada: ${data.control?.[0]?.horaEntrada || '-'}`);
    doc.text(`Hora salida: ${data.control?.[0]?.horaSalida || '-'}`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('ESTADO DEL VEHÍCULO');
    doc.fontSize(10).font('Helvetica').text(`Estado: ${data.estados_Vehiculo?.[0]?.estadoVehiculo || '-'}`);
    doc.text(`Observaciones: ${data.estados_Vehiculo?.[0]?.observaciones || '-'}`);
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(9).font('Helvetica').text('Gracias por su preferencia', { align: 'center' });
    doc.text(`Folio: #${req.params.id}`, { align: 'center' });

    doc.end();

  } catch (err) {
    console.error(err.message);
    res.render('error', { mensaje: 'Error al generar el ticket.' });
  }
});

// ══════════════════════════════════════════════
// GESTIÓN DE USUARIOS (admin)
// ══════════════════════════════════════════════

router.get('/editar/:correo', protegerAdmin, validateCorreoParam, async (req, res) => {
  const correo = decodeURIComponent(req.params.correo);

  const { data, error } = await supabase
    .from('usuarios')
    .select(`*, puestos ( nombre_puesto )`)
    .eq('correo', correo)
    .single();

  if (error || !data) {
    return res.render('error', { mensaje: 'Usuario no encontrado.' });
  }

  res.render('editar', { usuario: data });
});

router.post('/editar/:correo', protegerAdmin, validateCorreoParam, sanitizeBody, async (req, res) => {
  const correo = decodeURIComponent(req.params.correo);
  const { sanitizeText } = require('../middleware/security');

  const nombre        = sanitizeText(req.body.nombre || '');
  const password      = req.body.password      || '';
  const passConfirm   = req.body.password_confirm || '';
  const puesto        = parseInt(req.body.puesto, 10);

  // Validar nombre
  if (!nombre || nombre.length < 2 || nombre.length > 80 || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombre)) {
    // Cargar usuario para re-renderizar con error
    const { data } = await supabase.from('usuarios').select('*, puestos(nombre_puesto)').eq('correo', correo).single();
    return res.status(400).render('editar', { usuario: data || { correo, nombre: '', puesto: '' }, error: 'Nombre inválido: solo letras, mínimo 2 caracteres.' });
  }

  // Validar puesto
  if (![1, 2, 3, 4].includes(puesto)) {
    const { data } = await supabase.from('usuarios').select('*, puestos(nombre_puesto)').eq('correo', correo).single();
    return res.status(400).render('editar', { usuario: data || { correo, nombre, puesto: '' }, error: 'Puesto inválido.' });
  }

  const updateData = { nombre, puesto };

  // Cambiar contraseña SOLO si se escribió algo
  if (password.length > 0) {
    if (password.length < 6 || password.length > 50) {
      const { data } = await supabase.from('usuarios').select('*, puestos(nombre_puesto)').eq('correo', correo).single();
      return res.status(400).render('editar', { usuario: data || { correo, nombre, puesto }, error: 'La nueva contraseña debe tener entre 6 y 50 caracteres.' });
    }
    if (password !== passConfirm) {
      const { data } = await supabase.from('usuarios').select('*, puestos(nombre_puesto)').eq('correo', correo).single();
      return res.status(400).render('editar', { usuario: data || { correo, nombre, puesto }, error: 'Las contraseñas no coinciden.' });
    }
    updateData.password = password;
  }

  const { error } = await supabase
    .from('usuarios')
    .update(updateData)
    .eq('correo', correo);

  if (error) {
    const { data } = await supabase.from('usuarios').select('*, puestos(nombre_puesto)').eq('correo', correo).single();
    return res.render('editar', { usuario: data || { correo, nombre, puesto }, error: 'Error al actualizar. Intenta de nuevo.' });
  }

  res.redirect('/admin');
});

// GET conservado por retrocompatibilidad; POST es la forma segura (desde formulario)
router.post('/eliminar/:correo', protegerAdmin, validateCorreoParam, async (req, res) => {
  await supabase.from('usuarios').delete().eq('correo', decodeURIComponent(req.params.correo));
  res.redirect('/admin');
});

router.get('/eliminar/:correo', protegerAdmin, validateCorreoParam, async (req, res) => {
  await supabase.from('usuarios').delete().eq('correo', decodeURIComponent(req.params.correo));
  res.redirect('/admin');
});

module.exports = router;
