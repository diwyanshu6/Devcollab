const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateEmail, validateId } = require("../utils/validators");

// REGISTER USER
const CreateUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Please provide name, email, and password", 400);
  }

  validateEmail(email);

  // check existing user   
  const userExists = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (userExists.rows.length > 0) {
    throw new AppError("User already exists", 400);
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await pool.query(
    "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email, created_at",
    [name, email, hashedPassword]
  );

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: newUser.rows[0]
  });
});

//  LOGIN USER
const LoginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Please provide email and password", 400);
  }

  validateEmail(email);

  const user = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (user.rows.length === 0) {
    throw new AppError("Invalid credentials", 400);
  }

  const validPassword = await bcrypt.compare(
    password,
    user.rows[0].password
  );

  if (!validPassword) {
    throw new AppError("Invalid credentials", 400);
  }

  // create token
  const token = jwt.sign(
    { id: user.rows[0].id, email: user.rows[0].email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    message: "Logged in successfully",
    data: { token, user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email } }
  });
});

//  GET ALL USERS (Protected)
const Getalluser = asyncHandler(async (req, res) => {
  const users = await pool.query("SELECT id, name, email FROM users");
  res.json({
    success: true,
    message: "Users fetched successfully",
    data: users.rows
  });
});

//  DELETE USER
const DeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateId(id);

  const result = await pool.query("DELETE FROM users WHERE id=$1", [id]);

  if (result.rowCount === 0) {
    throw new AppError("User not found", 404);
  }

  res.json({ success: true, message: "User deleted" });
});

//  UPDATE USER
const UpdateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  validateId(id);

  if (!name) {
    throw new AppError("Please provide name", 400);
  }

  const updated = await pool.query(
    "UPDATE users SET name=$1 WHERE id=$2 RETURNING id, name, email",
    [name, id]
  );

  if (updated.rows.length === 0) {
    throw new AppError("User not found", 404);
  }

  res.json({
    success: true,
    message: "User updated successfully",
    data: updated.rows[0]
  });
});

module.exports = {
  CreateUser,
  LoginUser,
  Getalluser,
  DeleteUser,
  UpdateUser,
};
