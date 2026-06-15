const { sql } = require('../config/database');
const jwt = require('jsonwebtoken');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Generar QR para el empleado
const generarQR = async (req, res) => {
  const id_usuario = req.usuario.id;

  try {
    // Verificar si ya existe un token permanente para este usuario
    const existente = await sql.query`
      SELECT token FROM tokens_qr WHERE id_usuario = ${id_usuario} AND permanente = true
    `;

    let tokenQR;

    if (existente.recordset.length > 0) {
      tokenQR = existente.recordset[0].token;
    } else {
      tokenQR = jwt.sign(
        {
          id_usuario,
          numero_nomina: req.usuario.numero_nomina,
        },
        process.env.JWT_SECRET
        // sin expiresIn = no expira
      );

      await sql.query`
        INSERT INTO tokens_qr (id_usuario, token, usado, permanente, fecha_expiracion)
        VALUES (${id_usuario}, ${tokenQR}, false, true, '2099-12-31')
      `;
    }

    const qrImagen = await qrcode.toDataURL(tokenQR);

    res.json({
      mensaje: 'QR generado correctamente',
      qr: qrImagen,
      permanente: true
    });

  } catch (error) {
    console.error('Error al generar QR:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Validar QR (usado por el policía de entrada)
const validarQR = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ mensaje: 'Token QR requerido' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ acceso: false, mensaje: 'QR inválido o no reconocido' });
    }

    const tokenBD = await sql.query`
      SELECT t.id, u.id as id_usuario, u.nombre, u.apellido_paterno, 
             u.activo, r.nombre as rol, p.nombre as puesto,
             d.nombre as departamento
      FROM tokens_qr t
      INNER JOIN usuarios u ON t.id_usuario = u.id
      INNER JOIN roles r ON u.id_rol = r.id
      LEFT JOIN puestos p ON u.id_puesto = p.id
      LEFT JOIN departamentos d ON u.id_departamento = d.id
      WHERE t.token = ${token}
    `;

    if (tokenBD.recordset.length === 0) {
      return res.status(404).json({ acceso: false, mensaje: 'QR no encontrado' });
    }

    const registro = tokenBD.recordset[0];

    if (!registro.activo) {
      await sql.query`
        INSERT INTO accesos (id_usuario, id_token, resultado, motivo_rechazo, registrado_por)
        VALUES (${registro.id_usuario}, ${registro.id}, 'DENEGADO', 'Usuario inactivo', ${req.usuario.id})
      `;
      return res.status(401).json({ acceso: false, mensaje: 'Usuario inactivo' });
    }

    await sql.query`
      INSERT INTO accesos (id_usuario, id_token, resultado, registrado_por)
      VALUES (${registro.id_usuario}, ${registro.id}, 'PERMITIDO', ${req.usuario.id})
    `;

    res.json({
      acceso: true,
      mensaje: 'Acceso permitido',
      empleado: {
        nombre: registro.nombre,
        apellido_paterno: registro.apellido_paterno,
        puesto: registro.puesto,
        departamento: registro.departamento
      }
    });

  } catch (error) {
    console.error('Error al validar QR:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};// Obtener historial de accesos
const obtenerHistorial = async (req, res) => {
  try {
    const resultado = await sql.query`
      SELECT a.id, a.resultado, a.motivo_rechazo, a.fecha_acceso,
             u.nombre, u.apellido_paterno, u.numero_nomina,
             p.nombre as puesto
      FROM accesos a
      INNER JOIN usuarios u ON a.id_usuario = u.id
      LEFT JOIN puestos p ON u.id_puesto = p.id
      ORDER BY a.fecha_acceso DESC
    `;
    res.json(resultado.recordset);
  } catch (error) {
    console.error('Error al obtener historial:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
const obtenerQRUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const existente = await sql.query`
      SELECT t.token, u.nombre, u.apellido_paterno, u.numero_nomina,
             p.nombre as puesto, d.nombre as departamento
      FROM tokens_qr t
      INNER JOIN usuarios u ON t.id_usuario = u.id
      LEFT JOIN puestos p ON u.id_puesto = p.id
      LEFT JOIN departamentos d ON u.id_departamento = d.id
      WHERE t.id_usuario = ${id} AND t.permanente = true
    `;

    if (existente.recordset.length === 0) {
      // Generar QR si no existe
      const usuario = await sql.query`
        SELECT u.id, u.numero_nomina, u.nombre, u.apellido_paterno,
               p.nombre as puesto, d.nombre as departamento
        FROM usuarios u
        LEFT JOIN puestos p ON u.id_puesto = p.id
        LEFT JOIN departamentos d ON u.id_departamento = d.id
        WHERE u.id = ${id}
      `;

      if (usuario.recordset.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      const u = usuario.recordset[0];
      const tokenQR = jwt.sign(
        { id_usuario: u.id, numero_nomina: u.numero_nomina },
        process.env.JWT_SECRET
      );

      await sql.query`
        INSERT INTO tokens_qr (id_usuario, token, usado, permanente, fecha_expiracion)
        VALUES (${id}, ${tokenQR}, false, true, '2099-12-31')
      `;

      const qrImagen = await qrcode.toDataURL(tokenQR);
      return res.json({
        qr: qrImagen,
        usuario: { nombre: u.nombre, apellido_paterno: u.apellido_paterno, numero_nomina: u.numero_nomina, puesto: u.puesto, departamento: u.departamento }
      });
    }

    const registro = existente.recordset[0];
    const qrImagen = await qrcode.toDataURL(registro.token);

    res.json({
      qr: qrImagen,
      usuario: {
        nombre: registro.nombre,
        apellido_paterno: registro.apellido_paterno,
        numero_nomina: registro.numero_nomina,
        puesto: registro.puesto,
        departamento: registro.departamento
      }
    });

  } catch (error) {
    console.error('Error al obtener QR:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};


module.exports = { generarQR, validarQR, obtenerHistorial, obtenerQRUsuario };