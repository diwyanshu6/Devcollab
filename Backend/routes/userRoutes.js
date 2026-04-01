const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  CreateUser,
  LoginUser,
  Getalluser,
  DeleteUser,
  UpdateUser,
} = require("../controllers/userController");

router.post("/register", CreateUser);
router.post("/login", LoginUser);

router.use(auth); // Requires Auth below
router.get("/", Getalluser);
router.delete("/:id", DeleteUser);
router.put("/:id", UpdateUser);

module.exports = router;
