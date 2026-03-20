import express from "express";
const router = express.Router();
// Firebase handles authentication on the client side.
// Token verification is done via middleware on protected routes.
export default router;
