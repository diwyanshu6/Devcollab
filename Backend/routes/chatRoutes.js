const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { sendMessage, getMessages } = require("../controllers/chatController");

router.use(auth);

// send message
router.post("/:workspaceId", sendMessage);

// get messages
router.get("/:workspaceId", getMessages);

module.exports = router;
