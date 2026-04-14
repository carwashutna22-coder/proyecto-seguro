'use strict';

const supabase = require('../src/lib/supabase');

exports.login = async (req, res) => {
  const { correo, password } = req.body;

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      *,
      puestos ( nombre_puesto )
    `)
    .eq('correo', correo)
    .eq('password', password)
    .single();

  if (error || !data) {
    return res.render('login', { error: 'Usuario o contraseña incorrectos.' });
  }

  req.session.usuario = data;
  res.redirect('/admin');
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
