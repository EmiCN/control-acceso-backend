const { sql } = require('../config/database');
const jwt = require('jsonwebtoken');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Generar QR para el empleado
const generarQR = async (req, res) => {
  const id_usuario = req.usuario.id;

  try {
    await sql.query`
      UPDATE tokens_qr SET usado = true 
      WHERE id_usuario = ${id_usuario} AND usado = false
    `;

    const jti = uuidv4();
    const fecha_expiracion = new Date(Date.now() + 60 * 1000);

    const tokenQR = jwt.sign(
      {
        jti,
        id_usuario,
        numero_nomina: req.usuario.numero_nomina,
        nombre: req.usuario.nombre,
        apellido_paterno: req.usuario.apellido_paterno,
        rol: req.usuario.rol,
        turno: req.usuario.turno,
        puesto: req.usuario.puesto
      },
      process.env.JWT_SECRET,
      { expiresIn: '60s' }
    );

    await sql.query`
      INSERT INTO tokens_qr (id_usuario, token, usado, fecha_expiracion)
      VALUES (${id_usuario}, ${tokenQR}, false, ${fecha_expiracion})
    `;

    const qrImagen = await qrcode.toDataURL(tokenQR);

    res.json({
      mensaje: 'QR generado correctamente',
      qr: qrImagen,
      expira_en: 60,
      fecha_expiracion
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
      const tokenBD = await sql.query`SELECT id, id_usuario FROM tokens_qr WHERE token = ${token}`;
      
      if (tokenBD.recordset.length > 0) {
        await sql.query`
          INSERT INTO accesos (id_usuario, id_token, resultado, motivo_rechazo, registrado_por)
          VALUES (${tokenBD.recordset[0].id_usuario}, ${tokenBD.recordset[0].id}, 
                  'DENEGADO', 'QR expirado o inválido', ${req.usuario.id})
        `;
      }

      return res.status(401).json({
        acceso: false,
        mensaje: 'QR expirado o inválido'
      });
    }

    const tokenBD = await sql.query`
      SELECT t.id, t.usado, t.fecha_expiracion,
             u.id as id_usuario, u.nombre, u.apellido_paterno, 
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

    if (registro.usado) {
      await sql.query`
        INSERT INTO accesos (id_usuario, id_token, resultado, motivo_rechazo, registrado_por)
        VALUES (${registro.id_usuario}, ${registro.id}, 'DENEGADO', 'QR ya utilizado', ${req.usuario.id})
      `;
      return res.status(401).json({ acceso: false, mensaje: 'Este QR ya fue utilizado' });
    }

    if (!registro.activo) {
      await sql.query`
        INSERT INTO accesos (id_usuario, id_token, resultado, motivo_rechazo, registrado_por)
        VALUES (${registro.id_usuario}, ${registro.id}, 'DENEGADO', 'Usuario inactivo', ${req.usuario.id})
      `;
      return res.status(401).json({ acceso: false, mensaje: 'Usuario inactivo' });
    }

    await sql.query`
      UPDATE tokens_qr SET usado = true, fecha_uso = NOW() WHERE id = ${registro.id}
    `;

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
};
// Obtener historial de accesos
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

module.exports = { generarQR, validarQR, obtenerHistorial };