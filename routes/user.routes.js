import express from "express";
import { saveUser, getCurrentUser, getAllUsers, updateUserRole } from "../controllers/user.controller.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", saveUser);
router.get("/me", verifyToken, getCurrentUser);
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.patch("/:id/role", verifyToken, verifyAdmin, updateUserRole);

export default router;
