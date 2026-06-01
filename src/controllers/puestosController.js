const { sql } = require('../config/database');

const obtenerPuestos = async (req, res) => {
  try {
    const resultado = await sql.query`SELECT id, nombre, descripcion FROM puestos ORDER BY nombre`;
    res.json(resultado.recordset);
  } catch (error) {
    console.error('Error al obtener puestos:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const crearPuesto = async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
  try {
    const existe = await sql.query`SELECT id FROM puestos WHERE LOWER(nombre) = LOWER(${nombre})`;
    if (existe.recordset.length > 0) return res.status(400).json({ mensaje: 'Ya existe un área con ese nombre' });
    await sql.query`INSERT INTO puestos (nombre, descripcion) VALUES (${nombre}, ${descripcion})`;
    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, detalle)
      VALUES (${req.usuario.id}, 'CREAR_PUESTO', 'puestos', ${`Creó área: ${nombre}`})
    `;
    res.status(201).json({ mensaje: 'Área creada correctamente' });
  } catch (error) {
    console.error('Error al crear puesto:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const editarPuesto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
  try {
    const existe = await sql.query`SELECT id FROM puestos WHERE id = ${id}`;
    if (existe.recordset.length === 0) return res.status(404).json({ mensaje: 'Área no encontrada' });
    await sql.query`UPDATE puestos SET nombre = ${nombre}, descripcion = ${descripcion} WHERE id = ${id}`;
    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'EDITAR_PUESTO', 'puestos', ${id}, ${`Editó área ID ${id} a: ${nombre}`})
    `;
    res.json({ mensaje: 'Área actualizada correctamente' });
  } catch (error) {
    console.error('Error al editar puesto:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const eliminarPuesto = async (req, res) => {
  const { id } = req.params;
  try {
    const enUso = await sql.query`SELECT id FROM usuarios WHERE id_puesto = ${id} AND activo = true`;
    if (enUso.recordset.length > 0) {
      return res.status(400).json({ mensaje: 'No se puede eliminar, hay usuarios activos con esta área' });
    }
    await sql.query`DELETE FROM puestos WHERE id = ${id}`;
    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'ELIMINAR_PUESTO', 'puestos', ${id}, ${`Eliminó área ID ${id}`})
    `;
    res.json({ mensaje: 'Área eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar puesto:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { obtenerPuestos, crearPuesto, editarPuesto, eliminarPuesto };