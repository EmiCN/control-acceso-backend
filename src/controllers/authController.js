const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sql } = require('../config/database');
require('dotenv').config();

const login = async (req, res) => {
  const { numero_nomina, contrasena } = req.body;

  if (!numero_nomina || !contrasena) {
    return res.status(400).json({ mensaje: 'Número de nómina y contraseña son requeridos' });
  }

  try {
    const resultado = await sql.query`
      SELECT u.id, u.numero_nomina, u.nombre, u.apellido_paterno, 
             u.contrasena, u.activo, r.nombre as rol,
             t.nombre as turno, p.nombre as puesto
      FROM usuarios u
      INNER JOIN roles r ON u.id_rol = r.id
      LEFT JOIN turnos t ON u.id_turno = t.id
      LEFT JOIN puestos p ON u.id_puesto = p.id
      WHERE u.numero_nomina = ${numero_nomina}
    `;

    if (resultado.recordset.length === 0) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    const usuario = resultado.recordset[0];

    if (!usuario.activo) {
      return res.status(401).json({ mensaje: 'Usuario inactivo, contacte al administrador' });
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!contrasenaValida) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        numero_nomina: usuario.numero_nomina,
        nombre: usuario.nombre,
        apellido_paterno: usuario.apellido_paterno,
        rol: usuario.rol,
        turno: usuario.turno,
        puesto: usuario.puesto
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        numero_nomina: usuario.numero_nomina,
        nombre: usuario.nombre,
        apellido_paterno: usuario.apellido_paterno,
        rol: usuario.rol,
        turno: usuario.turno,
        puesto: usuario.puesto
      }
    });

  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { login };