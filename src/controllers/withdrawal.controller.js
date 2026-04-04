import { client } from "../lib/sanity.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { sendResponse } from "../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../lib/pagination.js";
import {
  sendWithdrawalSuccessEmail,
  sendWithdrawalRejectedEmail,
} from "../lib/mailer.js";

export const getWithdrawalsController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `
    *[_type == "withdrawal"]
    | order(createdAt desc)
    [$start...$end]{
      _id,
      crypto,
      amount,
      requestedAt,
      status,
      "user": {
        "_id": user->_id,
        "username": user->username
      }
    }
  `;

  const [withdrawals, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(`count(*[_type == "withdrawal"])`),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Withdrawals fetched successfully", 200, {
    records: withdrawals,
    pagination,
  });
});



// GET Single Withdrawal (Admin Only)
export const getWithdrawalController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendResponse(res, false, "Withdrawal ID is required", 400);
  }

  const withdrawal = await client.fetch(
    `*[_type == "withdrawal" && _id == $id][0]{
      _id, amount, crypto, status, requestedAt, updatedAt, walletAddress, user->{
        _id, username, accountBalance, email, phoneNumber, accountStatus, totalProfit, createdAt, updatedAt
      }
    }`,
    { id }
  );

  if (!withdrawal) {
    return sendResponse(res, false, "Withdrawal not found", 404);
  }

  return sendResponse(res, true, "Withdrawal fetched successfully", 200, withdrawal);
});

// PATCH — Update Withdrawal Status (Admin Only)
export const updateWithdrawalStatusController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    return sendResponse(res, false, "Withdrawal ID is required", 400);
  }

  const allowedStatuses = ["successful", "failed"];
  if (!allowedStatuses.includes(status)) {
    return sendResponse(
      res,
      false,
      `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      400
    );
  }

  const withdrawal = await client.fetch(
    `*[_type=="withdrawal" && _id==$id][0]{
      _id,
      status,
      amount,
      crypto,
      walletAddress,
      emailSuccessSent,
      emailRejectedSent,
      user->{
        _id,
        username,
        email,
        accountBalance
      }
    }`,
    { id }
  );

  if (!withdrawal) {
    return sendResponse(res, false, "Withdrawal not found", 404);
  }

  // Prevent double-processing
  if (withdrawal.status === "successful" && status === "successful") {
    return sendResponse(
      res,
      false,
      "This withdrawal has already been processed successfully",
      400
    );
  }

  // Balance deduction (only once)
  if (status === "successful" && withdrawal.user?._id) {
    const newBalance = Math.max((withdrawal.user.accountBalance || 0) - withdrawal.amount, 0);

    await client.patch(withdrawal.user._id).set({ accountBalance: newBalance }).commit();
  }

  // Update withdrawal status
  await client.patch(id).set({ status, updatedAt: new Date().toISOString() }).commit();

  // ===== EMAIL IDEMPOTENCY =====
  if (status === "successful" && !withdrawal.emailSuccessSent) {
    await sendWithdrawalSuccessEmail({
      email: withdrawal.user.email,
      name: withdrawal.user.username.split(" ")[0],
      crypto: withdrawal.crypto,
      amount: withdrawal.amount,
      walletAddress: withdrawal.walletAddress,
      date: new Date(),
    });

    await client.patch(id).set({ emailSuccessSent: true }).commit();
  }

  if (status === "failed" && !withdrawal.emailRejectedSent) {
    await sendWithdrawalRejectedEmail({
      email: withdrawal.user.email,
      name: withdrawal.user.username.split(" ")[0],
      crypto: withdrawal.crypto,
      amount: withdrawal.amount,
      walletAddress: withdrawal.walletAddress,
      reason: "Withdrawal verification failed",
      date: new Date(),
    });

    await client.patch(id).set({ emailRejectedSent: true }).commit();
  }

  return sendResponse(res, true, "Withdrawal status updated successfully", 200);
});

// DELETE — Remove Withdrawal (Admin Only)
export const deleteWithdrawalController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendResponse(res, false, "Withdrawal ID is required", 400);
  }

  const existing = await client.fetch(`*[_type=="withdrawal" && _id==$id][0]`, { id });

  if (!existing) {
    return sendResponse(res, false, "Withdrawal not found", 404);
  }

  await client.delete(id);

  return sendResponse(res, true, "Withdrawal deleted successfully", 200);
});
