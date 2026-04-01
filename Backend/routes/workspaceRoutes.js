const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const {
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
  joinWorkspace
} = require("../controllers/workspaceController");

router.use(auth);

// user workspace list
router.get("/", getUserWorkspaces);

// basic CRUD
router.post("/", createWorkspace);
router.get("/:id", getWorkspaceById);
router.put("/:id", updateWorkspace);
router.delete("/:id", deleteWorkspace);

// members management
router.post("/:id/members", addMember); // add member explicitly
router.delete("/:id/members/:userId", removeMember); // member leaves or owner kicks
router.get("/:id/members", getMembers); // get all members
router.delete("/:id/leave", leaveWorkspace); // leave workspace

// invite system
router.put("/:id/invite_code", regenerateInviteCode);
router.post("/join/:invite_code", joinWorkspace);

module.exports = router;
