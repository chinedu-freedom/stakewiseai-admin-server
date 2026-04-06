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
    | order(requestedAt desc)
    [$start...$end]{
      _id,
      amount,
      requestedAt,
      status,
      "user": {
        "_id": user->_id,
        "username": user->username,
        "email": user->email,
        "phoneNumber": user->phoneNumber
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

export const getWithdrawalController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendResponse(res, false, "Withdrawal ID is required", 400);
  }

  const withdrawal = await client.fetch(
    `*[_type == "withdrawal" && _id == $id][0]{
      _id,
      amount,
      status,
      requestedAt,
      updatedAt,
      walletAddress,
      user->{
        _id,
        username,
        email,
        accountBalance,
        totalProfit,
        reservedProfit,
        accountStatus
      }
    }`,
    { id }
  );

  if (!withdrawal) {
    return sendResponse(res, false, "Withdrawal not found", 404);
  }

  return sendResponse(res, true, "Withdrawal fetched successfully", 200, withdrawal);
});

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
      walletAddress,
      emailSuccessSent,
      emailRejectedSent,
      user->{
        _id,
        username,
        email,
        accountBalance,
        reservedProfit
      }
    }`,
    { id }
  );

  if (!withdrawal) {
    return sendResponse(res, false, "Withdrawal not found", 404);
  }

  if (withdrawal.status === "successful") {
    return sendResponse(
      res,
      false,
      "This withdrawal has already been processed",
      400
    );
  }

  const userId = withdrawal.user?._id;
  const amount = withdrawal.amount;

  if (status === "successful" && userId) {
    await client
      .transaction()
      // Deduct reservedProfit (release lock)
      .patch(userId, {
        inc: {
          reservedProfit: -amount,
        },
      })
      .commit();

    // Email (only once)
    if (!withdrawal.emailSuccessSent) {
      await sendWithdrawalSuccessEmail({
        email: withdrawal.user.email,
        name: withdrawal.user.username.split(" ")[0],
        crypto: "USDT",
        amount,
        walletAddress: withdrawal.walletAddress,
        date: new Date(),
      });

      await client.patch(id).set({ emailSuccessSent: true }).commit();
    }
  }

  if (status === "failed" && userId) {
    await client
      .transaction()
      // Release reserved profit back
      .patch(userId, {
        inc: {
          reservedProfit: -amount,
        },
      })
      .commit();

    if (!withdrawal.emailRejectedSent) {
      await sendWithdrawalRejectedEmail({
        email: withdrawal.user.email,
        name: withdrawal.user.username.split(" ")[0],
        crypto: "USDT",
        amount,
        walletAddress: withdrawal.walletAddress,
        reason: "Withdrawal verification failed",
        date: new Date(),
      });

      await client.patch(id).set({ emailRejectedSent: true }).commit();
    }
  }

  await client
    .patch(id)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .commit();

  return sendResponse(res, true, "Withdrawal status updated successfully", 200);
});

export const deleteWithdrawalController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendResponse(res, false, "Withdrawal ID is required", 400);
  }

  const existing = await client.fetch(
    `*[_type=="withdrawal" && _id==$id][0]`,
    { id }
  );

  if (!existing) {
    return sendResponse(res, false, "Withdrawal not found", 404);
  }

  await client.delete(id);

  return sendResponse(res, true, "Withdrawal deleted successfully", 200);
});