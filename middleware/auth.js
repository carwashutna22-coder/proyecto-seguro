exports.protegerAdmin = (req, res, next) => {

  console.log("SESSION:", req.session);
  console.log("USUARIO:", req.session.usuario);

  if (!req.session || !req.session.usuario) {
    console.log("❌ NO HAY SESIÓN");
    return res.redirect('/login');
  }

  console.log("✅ SESIÓN OK");
  next();
};