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

    console.log("INPUT:", password);
    console.log("BD:", usuario.password);

    let match = false;

    if (!usuario.password) {
      return res.render('login', { error: 'Usuario sin contraseña' });
    }

    const passDB = usuario.password.toString().trim();
    const passInput = password.toString().trim();

    // 🔥 Primero comparar texto plano
    if (passInput === passDB) {
      match = true;
    }
    // 🔐 Luego bcrypt
    else if (passDB.startsWith('$2b$')) {
      match = await bcrypt.compare(passInput, passDB);
    }

    // ❗ ESTA LÍNEA ES LA CLAVE
    if (!match) {
      return res.render('login', { error: 'Credenciales incorrectas' });
    }

    // ✅ CREAR SESIÓN SOLO SI ES CORRECTO
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