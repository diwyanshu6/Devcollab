const { Pool } = require('pg');
require('dotenv').config({ path: '/home/diwyanshu/Devcollab/Backend/.env' });
console.log(process.env.DB_PASS);
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS, 
  port: process.env.DB_PORT,
});

pool.connect()
  .then(() => console.log("DB Connected ")) 
  .catch(err => console.error("DB Error ❌", err));

module.exports = pool;