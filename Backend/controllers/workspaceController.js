const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateId } = require("../utils/validators");
const crypto = require("crypto");

//  Check if user is member
const isMember = async (userId, workspaceId) => {
  const result = await pool.query(
    "SELECT * FROM workspace_members WHERE user_id=$1 AND workspace_id=$2",
    [userId, workspaceId]
  );
  return result.rows.length > 0;
};

//  Check if user is owner
const isOwner = async (userId, workspaceId) => {
  const result = await pool.query(
    "SELECT created_by FROM workspaces WHERE id=$1",
    [workspaceId]
  );
  return result.rows[0]?.created_by === userId;
};

//  CREATE WORKSPACE
const createWorkspace = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    throw new AppError("Workspace name is required", 400);
  }

  const inviteCode = crypto.randomBytes(8).toString("hex");

  const workspace = await pool.query(
    "INSERT INTO workspaces (name, created_by, invite_code) VALUES ($1,$2,$3) RETURNING *",
    [name, userId, inviteCode]
  );

  const workspaceId = workspace.rows[0].id;

  //  creator is also member
  await pool.query(
    "INSERT INTO workspace_members (user_id, workspace_id) VALUES ($1,$2)",
    [userId, workspaceId]
  );

  res.status(201).json({
    success: true,
    message: "Workspace created",
    data: workspace.rows[0]
  });
});

//  GET ALL WORKSPACES (dashboard)
const getUserWorkspaces = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    `SELECT w.* FROM workspaces w
     JOIN workspace_members wm
     ON w.id = wm.workspace_id
     WHERE wm.user_id=$1`,
    [userId]
  );

  res.json({
    success: true,
    message: "Workspaces fetched",
    data: result.rows
  });
});

//  GET SINGLE WORKSPACE
const getWorkspaceById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;

  validateId(workspaceId);

  if (!(await isMember(userId, workspaceId))) {
    throw new AppError("Access denied", 403);
  }

  const workspace = await pool.query(
    "SELECT * FROM workspaces WHERE id=$1",
    [workspaceId]
  );

  if (workspace.rows.length === 0) {
    throw new AppError("Workspace not found", 404);
  }

  res.json({
    success: true,
    message: "Workspace fetched",
    data: workspace.rows[0]
  });
});

//  UPDATE WORKSPACE (owner only)
const updateWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;
  const { name } = req.body;

  validateId(workspaceId);

  if (!name) {
    throw new AppError("Workspace name is required", 400);
  }

  if (!(await isOwner(userId, workspaceId))) {
    throw new AppError("Only owner allowed", 403);
  }

  const updated = await pool.query(
    "UPDATE workspaces SET name=$1 WHERE id=$2 RETURNING *",
    [name, workspaceId]
  );

  if (updated.rows.length === 0) {
    throw new AppError("Workspace not found", 404);
  }

  res.json({
    success: true,
    message: "Workspace updated",
    data: updated.rows[0]
  });
});

//  DELETE WORKSPACE (owner only)
const deleteWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;

  validateId(workspaceId);

  if (!(await isOwner(userId, workspaceId))) {
    throw new AppError("Only owner allowed", 403);
  }

  // Manually cascade deletes to respect schema
  await pool.query("DELETE FROM chats WHERE workspace_id=$1", [workspaceId]);
  await pool.query("DELETE FROM notes WHERE workspace_id=$1", [workspaceId]);
  await pool.query("DELETE FROM workspace_members WHERE workspace_id=$1", [workspaceId]);
  
  const result = await pool.query("DELETE FROM workspaces WHERE id=$1", [workspaceId]);

  if (result.rowCount === 0) {
    throw new AppError("Workspace not found", 404);
  }

  res.json({
    success: true,
    message: "Workspace deleted"
  });
});

//  ADD MEMBER (owner only)
const addMember = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;
  const { memberId } = req.body;

  validateId(workspaceId);
  validateId(memberId);

  if (!(await isOwner(userId, workspaceId))) {
    throw new AppError("Only owner can add members", 403);
  }

  if (await isMember(memberId, workspaceId)) {
    throw new AppError("User is already a member", 400);
  }

  await pool.query(
    "INSERT INTO workspace_members (user_id, workspace_id) VALUES ($1,$2)",
    [memberId, workspaceId]
  );

  res.json({
    success: true,
    message: "Member added"
  });
});

//  REMOVE MEMBER (owner only)
const removeMember = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;
  const memberId = req.params.userId;

  validateId(workspaceId);
  validateId(memberId);

  if (!(await isOwner(userId, workspaceId))) {
    throw new AppError("Only owner can remove members", 403);
  }

  //  prevent removing owner
  const workspace = await pool.query(
    "SELECT created_by FROM workspaces WHERE id=$1",
    [workspaceId]
  );

  if (workspace.rows.length === 0) {
    throw new AppError("Workspace not found", 404);
  }

  if (workspace.rows[0].created_by == memberId) {
    throw new AppError("Cannot remove owner", 400);
  }

  const result = await pool.query(
    "DELETE FROM workspace_members WHERE user_id=$1 AND workspace_id=$2",
    [memberId, workspaceId]
  );

  if (result.rowCount === 0) {
    throw new AppError("Member not found", 404);
  }

  res.json({
    success: true,
    message: "Member removed"
  });
});

//  GET MEMBERS
const getMembers = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;

  validateId(workspaceId);

  if (!(await isMember(userId, workspaceId))) {
    throw new AppError("Access denied", 403);
  }

  const members = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN workspace_members wm ON u.id = wm.user_id
     WHERE wm.workspace_id=$1`,
    [workspaceId]
  );

  res.json({
    success: true,
    message: "Members fetched",
    data: members.rows
  });
});

//  LEAVE WORKSPACE
const leaveWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;

  validateId(workspaceId);

  //  owner cannot leave
  if (await isOwner(userId, workspaceId)) {
    throw new AppError("Owner cannot leave workspace. Delete it instead.", 400);
  }

  const result = await pool.query(
    "DELETE FROM workspace_members WHERE user_id=$1 AND workspace_id=$2",
    [userId, workspaceId]
  );

  if (result.rowCount === 0) {
    throw new AppError("Not a member", 400);
  }

  res.json({
    success: true,
    message: "Left workspace"
  });
});

// REGENERATE INVITE CODE (owner only)
const regenerateInviteCode = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.params.id;

  validateId(workspaceId);

  if (!(await isOwner(userId, workspaceId))) {
    throw new AppError("Only owner can regenerate invite code", 403);
  }

  const inviteCode = crypto.randomBytes(8).toString("hex");

  const updated = await pool.query(
    "UPDATE workspaces SET invite_code=$1 WHERE id=$2 RETURNING *",
    [inviteCode, workspaceId]
  );

  if (updated.rows.length === 0) {
    throw new AppError("Workspace not found", 404);
  }

  res.json({
    success: true,
    message: "Invite code regenerated",
    data: updated.rows[0]
  });
});

// JOIN WORKSPACE
const joinWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { invite_code } = req.params;

  if (!invite_code) {
    throw new AppError("Invite code is required", 400);
  }

  const workspace = await pool.query(
    "SELECT id FROM workspaces WHERE invite_code=$1",
    [invite_code]
  );

  if (workspace.rows.length === 0) {
    throw new AppError("Invalid or expired invite code", 404);
  }

  const workspaceId = workspace.rows[0].id;

  if (await isMember(userId, workspaceId)) {
    throw new AppError("You are already a member of this workspace", 400);
  }

  await pool.query(
    "INSERT INTO workspace_members (user_id, workspace_id) VALUES ($1,$2)",
    [userId, workspaceId]
  );

  res.json({
    success: true,
    message: "Successfully joined workspace",
    data: { workspaceId }
  });
});

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
  getMembers,
  leaveWorkspace,
  regenerateInviteCode,
  joinWorkspace,
  isMember
};
