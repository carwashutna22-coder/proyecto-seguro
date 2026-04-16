'use strict';

const supabase = require('../src/lib/supabase');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  const { correo, password } = req.body;

  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('correo', correo)
      .single();

    if (error || !usuario) {
      return res.render('login', { error: 'Credenciales incorrectas' });
    }

    // 🔐 COMPARAR PASSWORD
    const match = await bcrypt.compare(password, usuario.password);

    if (!match) {
      return res.render('login', { error: 'Credenciales incorrectas' });
    }

    // ✅ CREAR SESIÓN
    req.session.usuario = {
      correo: usuario.correo,
      nombre: usuario.nombre,
      puesto: usuario.puesto
    };

    res.redirect('/admin');

  } catch (err) {
    console.error(err.message);
    res.render('login', { error: 'Error interno' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};