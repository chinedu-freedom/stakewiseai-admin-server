import { verifyToken } from "../lib/auth.js";
import { sendResponse } from "../lib/response.js";

export const withAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return sendResponse(
        res,
        false,
        "Authentication required. Please log in.",
        401
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return sendResponse(
        res,
        false,
        "Session expired. Please log in again.",
        401
      );
    }

    if (payload.role !== "admin") {
      return sendResponse(
        res,
        false,
        "Access denied. Admin privileges required.",
        403
      );
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return sendResponse(
      res,
      false,
      "Something went wrong. Please try again later.",
      500
    );
  }
};
