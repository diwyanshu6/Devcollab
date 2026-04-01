const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateId } = require("../utils/validators");
const { isMember } = require("./workspaceController");

// EXTRACTED DB LOGIC FOR SOCKET REUSE
const saveMessageToDB = async (userId, workspaceId, messageContent) => {
  validateId(workspaceId);

  if (!messageContent || messageContent.trim() === "") {
    throw new AppError("Message cannot be empty", 400);
  }

  if (!(await isMember(userId, workspaceId))) {
    throw new AppError("Not a member", 403);
  }

  const newMsg = await pool.query(
    `INSERT INTO chats (message, user_id, workspace_id)
     VALUES ($1,$2,$3) RETURNING *`,
    [messageContent, userId, workspaceId]
  );

  return newMsg.rows[0];
};

// SEND MESSAGE VIA HTTP
const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.workspaceId;
  const { message } = req.body;

  const msg = await saveMessageToDB(userId, workspaceId, message);

  res.status(201).json({
    success: true,
    message: "Message sent",
    data: msg
  });
});

//  GET MESSAGES
const getMessages = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.workspaceId;
  let { limit, offset } = req.query;

  validateId(workspaceId);

  limit = parseInt(limit) > 0 ? parseInt(limit) : 50;
  offset = parseInt(offset) >= 0 ? parseInt(offset) : 0;

  if (!(await isMember(userId, workspaceId))) {
    throw new AppError("Not a member", 403);
  }

  const messages = await pool.query(
    `SELECT c.*, u.name
     FROM chats c
     JOIN users u ON c.user_id = u.id
     WHERE c.workspace_id=$1
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [workspaceId, limit, offset]
  );

  // We sorted descending to get latest messages first for pagination, 
  // but usually UI wants them ascending. Reverse them here.
  const sortedMessages = messages.rows.reverse();

  res.json({
    success: true,
    message: "Messages fetched",
    data: sortedMessages
  });
});

module.exports = { sendMessage, getMessages, saveMessageToDB };
