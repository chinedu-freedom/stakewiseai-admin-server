import { client } from "../lib/sanity.js";
import { generateToken } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { sendResponse } from "../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../lib/pagination.js";

export const getUsersController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `*[
    _type == "user" && 
    role == "user" && 
    (!defined(isDeleted) || !isDeleted)
  ]
  | order(createdAt desc)
  [$start...$end]{
    _id,
    username,
    email,
    phoneNumber,
    emailVerified,
    accountStatus,
    createdAt,
    updatedAt,
  }`;

  const totalQuery = `count(*[
    _type == "user" && 
    role == "user" && 
    (!defined(isDeleted) || !isDeleted)
  ])`;

  const [users, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(totalQuery),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Users fetched successfully", 200, {
    records: users,
    pagination,
  });
});


// GET — Admin fetch single user by ID
export const getUserByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) return sendResponse(res, false, "User ID is required", 400);

  try {
    const user = await client.fetch(
  `*[_type == "user" && role == "user" && _id == $id && (!defined(isDeleted) || isDeleted == false)][0]{
    _id,
    username,
    email,
    phoneNumber,
    accountStatus,
    accountBalance,
    emailVerified,
    image,
    referralCode,
    lastKnownIp,
    createdAt,
    updatedAt,
  }`,
  { id }
);


    if (!user) return sendResponse(res, false, "User not found", 404);

    return sendResponse(res, true, "User fetched successfully", 200, user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return sendResponse(res, false, "Failed to fetch user", 500);
  }
});

// PATCH — Admin update user
export const updateUserController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { accountStatus, accountBalance, emailVerified } = req.body;

  if (!id) return sendResponse(res, false, "User ID is required", 400);

  try {
    const currentUser = await client.fetch(
      `*[_type == "user" && role == "user" && _id == $id][0]{ 
        accountStatus, 
        accountBalance, 
        emailVerified 
      }`,
      { id }
    );

    if (!currentUser)
      return sendResponse(res, false, "User not found", 404);

    const updateFields = {};

    // =========================
    // ACCOUNT STATUS (WITH SYNC)
    // =========================
    if (accountStatus) {
      const status = accountStatus.toLowerCase();

      const allowedStatuses = [
        "pending",
        "active",
        "inactive",
        "suspended",
        "deactivated",
      ];

      if (!allowedStatuses.includes(status)) {
        return sendResponse(
          res,
          false,
          `Invalid account status. Allowed values: ${allowedStatuses.join(", ")}`,
          400
        );
      }

      if (status !== (currentUser.accountStatus || "").toLowerCase()) {
        updateFields.accountStatus = status;

        // ✅ AUTO SYNC emailVerified
        if (status === "active") {
          updateFields.emailVerified = true;
        }

        if (status === "pending") {
          updateFields.emailVerified = false;
        }
      }
    }

    // =========================
    // ACCOUNT BALANCE (INCREMENT)
    // =========================
    if (typeof accountBalance !== "undefined") {
      if (typeof accountBalance !== "number" || isNaN(accountBalance)) {
        return sendResponse(
          res,
          false,
          "Account balance must be a valid number",
          400
        );
      }

      if (accountBalance <= 0) {
        return sendResponse(
          res,
          false,
          "Amount must be greater than 0",
          400
        );
      }

      const currentBalance = Number(currentUser.accountBalance || 0);
      const newBalance = currentBalance + accountBalance;

      updateFields.accountBalance = newBalance;
    }

    // =========================
    // EMAIL VERIFIED (OPTIONAL MANUAL OVERRIDE)
    // =========================
    if (typeof emailVerified !== "undefined") {
      let parsedEmailVerified;

      if (typeof emailVerified === "boolean") {
        parsedEmailVerified = emailVerified;
      } else if (
        emailVerified === "true" ||
        emailVerified === "false"
      ) {
        parsedEmailVerified = emailVerified === "true";
      } else {
        return sendResponse(
          res,
          false,
          "emailVerified must be a boolean (true or false)",
          400
        );
      }

      if (parsedEmailVerified !== currentUser.emailVerified) {
        updateFields.emailVerified = parsedEmailVerified;
      }
    }

    // =========================
    // NO CHANGES CHECK
    // =========================
    if (Object.keys(updateFields).length === 0) {
      return sendResponse(
        res,
        false,
        "No changes detected. User data is already up to date.",
        400
      );
    }

    updateFields.updatedAt = new Date().toISOString();

    const updatedUser = await client.patch(id).set(updateFields).commit();

    return sendResponse(res, true, "User updated successfully", 200, {
      accountBalance: updatedUser.accountBalance,
      accountStatus: updatedUser.accountStatus,
      emailVerified: updatedUser.emailVerified,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return sendResponse(res, false, "Failed to update user", 500);
  }
});

// DELETE — Admin soft-delete user
export const deleteUserController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) return sendResponse(res, false, "User ID is required", 400);

  try {
    const user = await client.fetch(
      `*[_type == "user" && role == "user" && _id == $id && (!defined(isDeleted) || isDeleted == false)][0]`,
      { id }
    );

    if (!user) return sendResponse(res, false, "User not found or already deleted", 404);

    const updatedUser = await client.patch(id)
      .set({ isDeleted: true, updatedAt: new Date().toISOString() })
      .commit();

    return sendResponse(res, true, "User deleted successfully", 200, {
      username: updatedUser.username,
      email: updatedUser.email,
      isDeleted: updatedUser.isDeleted,
    });
  } catch (error) {
    console.error("Error soft-deleting user:", error);
    return sendResponse(res, false, "Failed to soft-delete user", 500);
  }
});

// GET — Fetch all activities/access logs for a specific user
export const getUserActivitiesController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) return sendResponse(res, false, "User ID is required", 400);

  try {
    const query = `*[_type == "userActivity" && user._ref == $id] | order(timestamp desc) {
      _id,
      action,
      details,
      status,
      timestamp,
      ipAddress,
      userAgent
    }`;
    
    const activities = await client.fetch(query, { id });
    return sendResponse(res, true, "User activities fetched successfully", 200, activities);
  } catch (error) {
    console.error("Error fetching user activities:", error);
    return sendResponse(res, false, "Failed to fetch user activities", 500);
  }
});

// POST — Generate a login token for a specific user to impersonate them
export const impersonateUserController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) return sendResponse(res, false, "User ID is required", 400);

  try {
    const user = await client.fetch(
      `*[_type == "user" && role == "user" && _id == $id && (!defined(isDeleted) || isDeleted == false)][0]`,
      { id }
    );

    if (!user) return sendResponse(res, false, "User not found or is deleted", 404);

    // Generate a token for this user
    const token = generateToken(user._id, user.role, { expiresIn: "2h" });

    return sendResponse(res, true, "Impersonation token generated", 200, { token });
  } catch (error) {
    console.error("Error generating impersonation token:", error);
    return sendResponse(res, false, "Failed to generate impersonation token", 500);
  }
});

