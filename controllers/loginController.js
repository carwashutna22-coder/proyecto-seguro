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

// 🔍 DEBUG (AQUÍ VA)
console.log("INPUT:", password);
console.log("BD:", usuario.password);

    // 🔐 COMPARAR PASSWORD
let match = false;

// 🔐 Validar que exista password
if (!usuario.password) {
  return res.render('login', { error: 'Usuario corrupto (sin contraseña)' });
}

// 🔐 Comparación segura
if (usuario.password.startsWith('$2b$')) {
  match = await bcrypt.compare(password, usuario.password);
} else {
  match = password.trim() === usuario.password.trim();
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