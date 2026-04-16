'use strict';

const supabase = require('../src/lib/supabase');
const { sanitizeText } = require('../middleware/security');
const bcrypt = require('bcrypt');

exports.registrar = async (req, res) => {
  const nombre   = sanitizeText(req.body.nombre || '');
  const correo   = sanitizeText(req.body.correo || '').toLowerCase();
  const password = req.body.password;
  const puesto   = parseInt(req.body.puesto, 10);

  // 🔐 VALIDAR NOMBRE
  if (!nombre || nombre.length < 2 || nombre.length > 80) {
    return res.render('registro', { error: 'Nombre inválido' });
  }

  // 🔐 VALIDAR CORREO
  const emailValido = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailValido.test(correo) || correo.length > 100) {
    return res.render('registro', { error: 'Correo inválido' });
  }

  // 🔐 VALIDAR PASSWORD
  const passwordValido = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!passwordValido.test(password)) {
    return res.render('registro', { error: 'Contraseña insegura' });
  }

  // 🔐 VALIDAR PUESTO
  if (![1, 2, 3, 4].includes(puesto)) {
    return res.status(400).render('error', { mensaje: 'Puesto inválido.' });
  }

  try {
    // 🔍 Verificar si existe
    const { data: existe } = await supabase
      .from('usuarios')
      .select('correo')
      .eq('correo', correo)
      .single();

    if (existe) {
      return res.render('registro', { error: 'El correo ya está registrado.' });
    }

    // 🔐 HASH PASSWORD
    const hash = await bcrypt.hash(password, 10);

    // 💾 Guardar
    const { error } = await supabase
      .from('usuarios')
      .insert([{ nombre, correo, password: hash, puesto }]);

    if (error) {
      console.error(error.message);
      return res.render('registro', { error: 'Error al registrar.' });
    }

    res.redirect('/login');

  } catch (err) {
    console.error(err.message);
    res.render('registro', { error: 'Error interno.' });
  }
};