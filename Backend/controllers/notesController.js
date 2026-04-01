const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateId } = require("../utils/validators");
const { isMember } = require("./workspaceController");

//  CREATE NOTE
const createNote = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.workspaceId;
  const { content } = req.body;

  validateId(workspaceId);

  if (!content) {
    throw new AppError("Note content is required", 400);
  }

  if (!(await isMember(userId, workspaceId))) {
    throw new AppError("Not a member", 403);
  }

  const note = await pool.query(
    `INSERT INTO notes (content, user_id, workspace_id)
     VALUES ($1,$2,$3) RETURNING *`,
    [content, userId, workspaceId]
  );

  res.status(201).json({
    success: true,
    message: "Note created",
    data: note.rows[0]
  });
});

//  GET NOTES
const getNotes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.workspaceId;

  validateId(workspaceId);

  if (!(await isMember(userId, workspaceId))) {
    throw new AppError("Not a member", 403);
  }

  const notes = await pool.query(
    "SELECT * FROM notes WHERE workspace_id=$1 ORDER BY created_at DESC",
    [workspaceId]
  );

  res.json({
    success: true,
    message: "Notes fetched",
    data: notes.rows
  });
});

//  UPDATE NOTE
const updateNote = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const noteId = req.params.noteId;
  const { content } = req.body;

  validateId(noteId);

  if (!content) {
    throw new AppError("Note content is required", 400);
  }

  const noteCheck = await pool.query("SELECT * FROM notes WHERE id=$1", [noteId]);
  
  if (noteCheck.rows.length === 0) {
    throw new AppError("Note not found", 404);
  }

  // Ensure user is the author of the note or member? (The prompt: "Ensure only valid users can update/delete notes". Let's restrict to note author)
  if (noteCheck.rows[0].user_id !== userId) {
    throw new AppError("Only the author can update this note", 403);
  }

  const updatedNote = await pool.query(
    "UPDATE notes SET content=$1 WHERE id=$2 RETURNING *",
    [content, noteId]
  );

  res.json({
    success: true,
    message: "Note updated",
    data: updatedNote.rows[0]
  });
});

//  DELETE NOTE
const deleteNote = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const noteId = req.params.noteId;

  validateId(noteId);

  const noteCheck = await pool.query("SELECT * FROM notes WHERE id=$1", [noteId]);
  
  if (noteCheck.rows.length === 0) {
    throw new AppError("Note not found", 404);
  }

  // Restrict to note author
  if (noteCheck.rows[0].user_id !== userId) {
    throw new AppError("Only the author can delete this note", 403);
  }

  await pool.query("DELETE FROM notes WHERE id=$1", [noteId]);

  res.json({
    success: true,
    message: "Note deleted"
  });
});

module.exports = { createNote, getNotes, updateNote, deleteNote };
