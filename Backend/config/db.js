const { Pool } = require("pg");
require("dotenv").config();
console.log(process.env.DATABASE_URL);
//  Force IPv4 resolution
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;