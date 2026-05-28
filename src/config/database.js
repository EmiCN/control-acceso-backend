const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Conectado a PostgreSQL correctamente');
  } catch (error) {
    console.error('Error al conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
};

const sql = {
  query: async (strings, ...values) => {
    let text = '';
    let params = [];
    if (typeof strings === 'string') {
      text = strings;
      params = values[0] || [];
      const result = await pool.query(text, params);
      return { recordset: result.rows };
    }
    strings.forEach((str, i) => {
      text += str;
      if (i < values.length) {
        params.push(values[i]);
        text += `$${params.length}`;
      }
    });
    const result = await pool.query(text, params);
    return { recordset: result.rows };
  }
};

module.exports = { connectDB, sql };