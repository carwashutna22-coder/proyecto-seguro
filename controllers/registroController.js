'use strict';

const supabase = require('../src/lib/supabase');
const { sanitizeText } = require('../middleware/security');

exports.registrar = async (req, res) => {
  // Campos ya validados por middleware
  const nombre   = sanitizeText(req.body.nombre   || '');
  const correo   = sanitizeText(req.body.correo   || '').toLowerCase();
  const password = req.body.password; // contraseña no se sanitiza (caracteres especiales válidos)
  const puesto   = parseInt(req.body.puesto, 10);

  // Validar que el puesto sea un número entero permitido (1-4)
  if (![1, 2, 3, 4].includes(puesto)) {
    return res.status(400).render('error', { mensaje: 'Puesto inválido.' });
  }

  try {
    // Verificar si el correo ya existe
    const { data: existe } = await supabase
      .from('usuarios')
      .select('correo')
      .eq('correo', correo)
      .single();

    if (existe) {
      return res.render('registro', { error: 'El correo ya está registrado.' });
    }

    const { error } = await supabase
      .from('usuarios')
      .insert([{ nombre, correo, password, puesto }]);

    if (error) {
      console.error('Error al registrar:', error.message);
      return res.render('registro', { error: 'Error al registrar. Intenta de nuevo.' });
    }

    res.redirect('/login');

  } catch (err) {
    console.error('Error en registro:', err.message);
    res.render('registro', { error: 'Error interno. Intenta de nuevo.' });
  }
};
