const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { createNote, getNotes, updateNote, deleteNote } = require("../controllers/notesController");

router.use(auth);

router.post("/:workspaceId", createNote);
router.get("/:workspaceId", getNotes);
router.put("/:noteId", updateNote);
router.delete("/:noteId", deleteNote);

module.exports = router;
