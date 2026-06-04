const { sql } = require('../config/database');

const obtenerDepartamentos = async (req, res) => {
  try {
    const resultado = await sql.query`SELECT id, nombre, descripcion FROM departamentos ORDER BY nombre`;
    res.json(resultado.recordset);
  } catch (error) {
    console.error('Error al obtener departamentos:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const crearDepartamento = async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
  try {
    const existe = await sql.query`SELECT id FROM departamentos WHERE LOWER(nombre) = LOWER(${nombre})`;
    if (existe.recordset.length > 0) return res.status(400).json({ mensaje: 'Ya existe un departamento con ese nombre' });
    await sql.query`INSERT INTO departamentos (nombre, descripcion) VALUES (${nombre}, ${descripcion})`;
    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, detalle)
      VALUES (${req.usuario.id}, 'CREAR_DEPARTAMENTO', 'departamentos', ${`Creó departamento: ${nombre}`})
    `;
    res.status(201).json({ mensaje: 'Departamento creado correctamente' });
  } catch (error) {
    console.error('Error al crear departamento:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const editarDepartamento = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
  try {
    const existe = await sql.query`SELECT id FROM departamentos WHERE id = ${id}`;
    if (existe.recordset.length === 0) return res.status(404).json({ mensaje: 'Departamento no encontrado' });
    await sql.query`UPDATE departamentos SET nombre = ${nombre}, descripcion = ${descripcion} WHERE id = ${id}`;
    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'EDITAR_DEPARTAMENTO', 'departamentos', ${id}, ${`Editó departamento a: ${nombre}`})
    `;
    res.json({ mensaje: 'Departamento actualizado correctamente' });
  } catch (error) {
    console.error('Error al editar departamento:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const eliminarDepartamento = async (req, res) => {
  const { id } = req.params;
  try {
    const enUso = await sql.query`SELECT id FROM usuarios WHERE id_departamento = ${id} AND activo = true`;
    if (enUso.recordset.length > 0) {
      return res.status(400).json({ mensaje: 'No se puede eliminar, hay usuarios activos en este departamento' });
    }
    await sql.query`DELETE FROM departamentos WHERE id = ${id}`;
    await sql.query`
      INSERT INTO auditoria (id_usuario_accion, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (${req.usuario.id}, 'ELIMINAR_DEPARTAMENTO', 'departamentos', ${id}, ${`Eliminó departamento ID ${id}`})
    `;
    res.json({ mensaje: 'Departamento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar departamento:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { obtenerDepartamentos, crearDepartamento, editarDepartamento, eliminarDepartamento };