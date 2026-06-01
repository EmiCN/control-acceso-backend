const { sql } = require('../config/database');
const bcrypt = require('bcryptjs');

const obtenerUsuarios = async (req, res) => {
  try {
    const resultado = await sql.query`
      SELECT u.id, u.numero_nomina, u.nombre, u.apellido_paterno, 
             u.apellido_materno, u.activo, u.fecha_alta, u.fecha_baja,
             u.foto_url, r.nombre as rol, p.nombre as puesto
      FROM usuarios u
      INNER JOIN roles r ON u.id_rol = r.id
      LEFT JOIN puestos p ON u.id_puesto = p.id
      ORDER BY u.fecha_alta DESC
    `;
    res.json(resultado.recordset);
  } catch (error) {
    console.error('Error al obtener usuarios:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await sql.query`
      SELECT u.id, u.numero_nomina, u.nombre, u.apellido_paterno,
             u.apellido_materno, u.activo, u.fecha_alta, u.fecha_baja,
             u.foto_url, r.nombre as rol, r.id as id_rol,
             p.nombre as puesto, p.id as id_puesto
      FROM usuarios u
      INNER JOIN roles r ON u.id_rol = r.id
      LEFT JOIN puestos p ON u.id_puesto = p.id
      WHERE u.id = ${id}
    `;
    if (resultado.recordset.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.json(resultado.recordset[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const crearUsuario = async (req, res) => {
  const { numero_nomina, nombre, apellido_paterno, apellido_materno, contrasena, id_rol, id_puesto, foto_url } = req.body;

  if (!numero_nomina || !nombre || !apellido_paterno || !contrasena || !id_rol) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
  }

  if (req.usuario.rol === 'administrativo' && (id_rol === 1 || id_rol === 2)) {
    return res.status(403).json({ mensaje: 'No tienes permiso para crear ese tipo de usuario' });
  }

  try {
    const existe = await sql.query`SELECT id FROM usuarios WHERE numero_nomina = ${numero_nomina}`;
    if (existe.recordset.length > 0) {
      return res.status(400).json({ mensaje: 'El número de nómina ya existe' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    await sql.query`
      INSERT INTO usuarios (numero_nomina, nombre, apellido_paterno, apellido_materno, contrasena, id_rol, id_puesto, creado_por, foto_url)
      VALUES (${numero_nomina}, ${nombre}, ${apellido_paterno}, ${apellido_materno}, ${contrasenaHash}, ${id_rol}, ${id_puesto}, ${req.usuario.id}, ${foto_url})
    `;

    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, detalle)
      VALUES (${req.usuario.id}, 'CREAR_USUARIO', 'usuarios', ${`Creó usuario con nómina ${numero_nomina}`})
    `;

    res.status(201).json({ mensaje: 'Usuario creado correctamente' });
  } catch (error) {
    console.error('Error al crear usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const modificarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido_paterno, apellido_materno, id_puesto, id_rol, foto_url } = req.body;

  try {
    const usuarioExiste = await sql.query`SELECT id, id_rol, nombre, apellido_paterno FROM usuarios WHERE id = ${id}`;
    if (usuarioExiste.recordset.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (req.usuario.rol === 'administrativo' && (usuarioExiste.recordset[0].id_rol === 1 || usuarioExiste.recordset[0].id_rol === 2)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para modificar ese usuario' });
    }

    const anterior = usuarioExiste.recordset[0];
    const detalle = `${req.usuario.nombre} ${req.usuario.apellido_paterno} modificó a ${anterior.nombre} ${anterior.apellido_paterno}`;

    await sql.query`
      UPDATE usuarios 
      SET nombre = ${nombre}, apellido_paterno = ${apellido_paterno}, 
          apellido_materno = ${apellido_materno},
          id_puesto = ${id_puesto}, id_rol = ${id_rol},
          foto_url = COALESCE(${foto_url}, foto_url)
      WHERE id = ${id}
    `;

    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'MODIFICAR_USUARIO', 'usuarios', ${id}, ${detalle})
    `;

    res.json({ mensaje: 'Usuario modificado correctamente' });
  } catch (error) {
    console.error('Error al modificar usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const darDeBaja = async (req, res) => {
  const { id } = req.params;

  try {
    const usuarioExiste = await sql.query`SELECT id, id_rol FROM usuarios WHERE id = ${id}`;
    if (usuarioExiste.recordset.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (req.usuario.rol === 'administrativo' && (usuarioExiste.recordset[0].id_rol === 1 || usuarioExiste.recordset[0].id_rol === 2)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para dar de baja ese usuario' });
    }

    await sql.query`
      UPDATE usuarios SET activo = false, fecha_baja = NOW() WHERE id = ${id}
    `;

    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'BAJA_USUARIO', 'usuarios', ${id}, 'Dio de baja al usuario')
    `;

    res.json({ mensaje: 'Usuario dado de baja correctamente' });
  } catch (error) {
    console.error('Error al dar de baja:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const darDeAlta = async (req, res) => {
  const { id } = req.params;

  try {
    await sql.query`
      UPDATE usuarios SET activo = true, fecha_baja = NULL WHERE id = ${id}
    `;

    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'ALTA_USUARIO', 'usuarios', ${id}, 'Reactivó al usuario')
    `;

    res.json({ mensaje: 'Usuario reactivado correctamente' });
  } catch (error) {
    console.error('Error al dar de alta:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    await sql.query`DELETE FROM auditoria WHERE id_usuario_accion = ${id}`;
    await sql.query`DELETE FROM accesos WHERE id_usuario = ${id}`;
    await sql.query`DELETE FROM tokens_qr WHERE id_usuario = ${id}`;
    await sql.query`DELETE FROM usuarios WHERE id = ${id}`;

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
const cambiarCredenciales = async (req, res) => {
  const { id } = req.params;
  const { numero_nomina, contrasena } = req.body;

  try {
    const usuarioExiste = await sql.query`SELECT id, id_rol FROM usuarios WHERE id = ${id}`;
    if (usuarioExiste.recordset.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Administrativo solo puede cambiar nómina, no contraseña
    if (req.usuario.rol === 'administrativo' && contrasena) {
      return res.status(403).json({ mensaje: 'No tienes permiso para cambiar la contraseña' });
    }

    if (numero_nomina) {
      const existe = await sql.query`SELECT id FROM usuarios WHERE numero_nomina = ${numero_nomina} AND id != ${id}`;
      if (existe.recordset.length > 0) {
        return res.status(400).json({ mensaje: 'Ese número de nómina ya existe' });
      }
      await sql.query`UPDATE usuarios SET numero_nomina = ${numero_nomina} WHERE id = ${id}`;
    }

    if (contrasena && req.usuario.rol === 'administrador') {
      const hash = await bcrypt.hash(contrasena, 10);
      await sql.query`UPDATE usuarios SET contrasena = ${hash} WHERE id = ${id}`;
    }

    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'CAMBIAR_CREDENCIALES', 'usuarios', ${id}, 
      ${`${req.usuario.nombre} cambió credenciales del usuario ID ${id}`})
    `;

    res.json({ mensaje: 'Credenciales actualizadas correctamente' });
  } catch (error) {
    console.error('Error al cambiar credenciales:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
module.exports = { obtenerUsuarios, obtenerUsuarioPorId, crearUsuario, modificarUsuario, darDeBaja, darDeAlta, eliminarUsuario, cambiarCredenciales };