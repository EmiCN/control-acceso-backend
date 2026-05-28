const sql = require('mssql');
require('dotenv').config();

const config = {
  user: 'admin_control',
  password: 'Control2024*',
  server: 'localhost\\SQLEXPRESS',
  database: 'control_acceso',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log('Conectado a SQL Server correctamente');
  } catch (error) {
    console.error('Error al conectar a SQL Server:', error.message);
    process.exit(1);
  }
};

module.exports = { connectDB, sql };