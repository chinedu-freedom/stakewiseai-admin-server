import { client } from "../lib/sanity.js";
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
    accountStatus,
    emailVerified,
    accountBalance,
    createdAt,
    "status": coalesce(
      *[_type == "kyc" && user._ref == ^._id][0].status,
      "not submitted"
    )
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
    referralCode,
    isDeleted,
    createdAt,
    updatedAt,
    "kyc": coalesce(
      *[_type == "kyc" && references(^._id)][0]{
        createdAt,
        _id,
        status
      },
      {
        "status": "not submitted"
      }
    )
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
  const { accountStatus, accountBalance } = req.body;

  if (!id) return sendResponse(res, false, "User ID is required", 400);

  try {
    const currentUser = await client.fetch(
      `*[_type == "user" && role == "user" && _id == $id][0]{ accountStatus, accountBalance }`,
      { id }
    );

    if (!currentUser) return sendResponse(res, false, "User not found", 404);

    const updateFields = {};

    if (accountStatus) {
      const status = accountStatus.toLowerCase();
      const allowedStatuses = ["pending", "active", "inactive", "suspended", "deactivated"];
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
      }
    }

    if (typeof accountBalance !== "undefined") {
      if (typeof accountBalance !== "number" || isNaN(accountBalance)) {
        return sendResponse(res, false, "Account balance must be a valid number", 400);
      }
      if (accountBalance < 0) {
        return sendResponse(res, false, "Account balance cannot be negative", 400);
      }
      if (accountBalance !== currentUser.accountBalance) {
        updateFields.accountBalance = accountBalance;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return sendResponse(res, false, "No changes detected. User data is already up to date.", 400);
    }

    updateFields.updatedAt = new Date().toISOString();
    const updatedUser = await client.patch(id).set(updateFields).commit();

    return sendResponse(res, true, "User updated successfully", 200, {
      accountBalance: updatedUser.accountBalance,
      accountStatus: updatedUser.accountStatus,
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

