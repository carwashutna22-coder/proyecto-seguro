'use strict';

const supabase = require('../src/lib/supabase');
const { sanitizeText } = require('../middleware/security');

// Lista blanca de servicios y estados permitidos
const SERVICIOS_VALIDOS = [
  'Lavado básico', 'Lavado completo', 'Lavado con cera',
  'Aspirado interior', 'Lavado de motor', 'Pulido / encerado'
];
const TIPOS_VEHICULO_VALIDOS = ['Auto', 'Camioneta', 'Moto', 'Otro'];
const ESTADOS_VALIDOS = ['Sin daños visibles', 'Con daños visibles'];

exports.guardarServicio = async (req, res) => {
  // Campos ya validados por middleware validateServicio
  const {
    nombreCliente, telefonoCliente,
    marcaVehiculo, modeloVehiculo, anioVehiculo, colorVehiculo, placasVehiculo, tipoVehiculo,
    servicio, precio,
    estadoVehiculo, observaciones,
    fechaServicio, horaEntrada, horaSalida,
    notificarWhatsapp, mensajeWhatsapp
  } = req.body;

  // Validar valores de lista blanca (select fields)
  if (!SERVICIOS_VALIDOS.includes(servicio)) {
    return res.status(400).render('error', { mensaje: 'Servicio no válido.' });
  }
  if (!TIPOS_VEHICULO_VALIDOS.includes(tipoVehiculo)) {
    return res.status(400).render('error', { mensaje: 'Tipo de vehículo no válido.' });
  }
  if (!ESTADOS_VALIDOS.includes(estadoVehiculo)) {
    return res.status(400).render('error', { mensaje: 'Estado del vehículo no válido.' });
  }

  // Sanitizar campos de texto libre
  const nombreS       = sanitizeText(nombreCliente);
  const telefonoS     = telefonoCliente.replace(/\D/g, '').slice(0, 10); // solo dígitos
  const marcaS        = sanitizeText(marcaVehiculo);
  const modeloS       = sanitizeText(modeloVehiculo);
  const anioN         = parseInt(anioVehiculo, 10);
  const colorS        = sanitizeText(colorVehiculo || '');
  const placasS       = sanitizeText(placasVehiculo).toUpperCase();
  const precioN       = parseFloat(precio);
  const observacionesS = sanitizeText(observaciones || '').slice(0, 200);
  const mensajeS      = sanitizeText(mensajeWhatsapp || '').slice(0, 200);

  try {
    // 1. Insertar cliente
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .insert([{ nombreCliente: nombreS, telefonoCliente: telefonoS }])
      .select()
      .single();

    if (clienteError) throw clienteError;
    const id_cliente = clienteData.id_cliente;

    // 2. Insertar vehículo
    const { data: vehiculoData, error: vehiculoError } = await supabase
      .from('vehiculos')
      .insert([{
        marcaVehiculo: marcaS, modeloVehiculo: modeloS,
        anioVehiculo: anioN, colorVehiculo: colorS,
        placasVehiculo: placasS, tipoVehiculo, id_cliente
      }])
      .select()
      .single();

    if (vehiculoError) throw vehiculoError;
    const id_vehiculo = vehiculoData.id_vehiculo;

    // 3. Buscar o insertar servicio (usando lista blanca)
    let id_servicio;
    const { data: servicioExiste } = await supabase
      .from('servicios')
      .select('id_servicio')
      .eq('servicio', servicio)
      .single();

    if (servicioExiste) {
      id_servicio = servicioExiste.id_servicio;
    } else {
      const { data: nuevoServicio, error: servicioError } = await supabase
        .from('servicios')
        .insert([{ servicio, precio: precioN }])
        .select()
        .single();
      if (servicioError) throw servicioError;
      id_servicio = nuevoServicio.id_servicio;
    }

    // 4. Insertar registro_servicio
    const { data: registroData, error: registroError } = await supabase
      .from('registro_servicio')
      .insert([{ id_cliente, id_vehiculo, id_servicio, fecha: fechaServicio }])
      .select()
      .single();

    if (registroError) throw registroError;
    const id_registro = registroData.id_registro;

    // 5. Insertar control
    const { error: controlError } = await supabase
      .from('control')
      .insert([{ id_registro, fechaServicio, horaEntrada, horaSalida: horaSalida || null }]);

    if (controlError) throw controlError;

    // 6. Insertar estado del vehículo
    const { error: estadoError } = await supabase
      .from('estados_Vehiculo')
      .insert([{ id_registro, estadoVehiculo, observaciones: observacionesS }]);

    if (estadoError) throw estadoError;

    // 7. Guardar notificación WhatsApp (solo si está marcado)
    
  } catch (err) {
    console.error('Error al guardar servicio:', err.message);
    res.render('error', { mensaje: 'Error al registrar el servicio. Intenta de nuevo.' });
  }
};
