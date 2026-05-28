const { sql } = require('./database');

const initDB = async () => {
  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        descripcion VARCHAR(200)
      )
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS turnos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL
      )
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS puestos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(200)
      )
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        numero_nomina VARCHAR(20) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        apellido_paterno VARCHAR(100) NOT NULL,
        apellido_materno VARCHAR(100),
        contrasena VARCHAR(255) NOT NULL,
        id_rol INT NOT NULL REFERENCES roles(id),
        id_turno INT REFERENCES turnos(id),
        id_puesto INT REFERENCES puestos(id),
        activo BOOLEAN DEFAULT true,
        fecha_alta TIMESTAMP DEFAULT NOW(),
        fecha_baja TIMESTAMP,
        creado_por INT
      )
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS tokens_qr (
        id SERIAL PRIMARY KEY,
        id_usuario INT NOT NULL REFERENCES usuarios(id),
        token VARCHAR(500) NOT NULL UNIQUE,
        usado BOOLEAN DEFAULT false,
        fecha_creacion TIMESTAMP DEFAULT NOW(),
        fecha_expiracion TIMESTAMP NOT NULL,
        fecha_uso TIMESTAMP
      )
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS accesos (
        id SERIAL PRIMARY KEY,
        id_usuario INT NOT NULL REFERENCES usuarios(id),
        id_token INT NOT NULL REFERENCES tokens_qr(id),
        resultado VARCHAR(20) NOT NULL,
        motivo_rechazo VARCHAR(200),
        fecha_acceso TIMESTAMP DEFAULT NOW(),
        registrado_por INT
      )
    `);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id SERIAL PRIMARY KEY,
        id_usuario_accion INT NOT NULL REFERENCES usuarios(id),
        accion VARCHAR(100) NOT NULL,
        tabla_afectada VARCHAR(100),
        id_registro_afectado INT,
        detalle VARCHAR(500),
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await sql.query(`
      INSERT INTO roles (nombre, descripcion)
      SELECT * FROM (VALUES
        ('administrador', 'Acceso total al sistema'),
        ('administrativo', 'Puede dar alta y baja de empleados'),
        ('policia', 'Lector de QR en entrada'),
        ('empleado', 'Solo puede generar su QR')
      ) AS v(nombre, descripcion)
      WHERE NOT EXISTS (SELECT 1 FROM roles LIMIT 1)
    `);

    await sql.query(`
      INSERT INTO turnos (nombre, hora_inicio, hora_fin)
      SELECT * FROM (VALUES
        ('Matutino', '06:00:00', '14:00:00'),
        ('Vespertino', '14:00:00', '22:00:00'),
        ('Nocturno', '22:00:00', '06:00:00')
      ) AS v(nombre, hora_inicio, hora_fin)
      WHERE NOT EXISTS (SELECT 1 FROM turnos LIMIT 1)
    `);

    await sql.query(`
      INSERT INTO puestos (nombre)
      SELECT * FROM (VALUES
        ('Operador'), ('Supervisor'), ('Técnico'),
        ('Administrativo'), ('Seguridad')
      ) AS v(nombre)
      WHERE NOT EXISTS (SELECT 1 FROM puestos LIMIT 1)
    `);

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar BD:', error.message);
  }
};

module.exports = initDB;