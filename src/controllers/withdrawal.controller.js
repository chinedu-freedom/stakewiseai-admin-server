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
      updatedAt,
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
      crypto,
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

  // Map incoming frontend status to Sanity schema values (approved/rejected)
  const normalizedStatus = (status === "successful" || status === "approved") ? "approved" : (status === "failed" || status === "rejected") ? "rejected" : status;

  if (withdrawal.status === "approved" || withdrawal.status === "successful") {
    return sendResponse(
      res,
      false,
      "This withdrawal has already been processed",
      400
    );
  }

  const userId = withdrawal.user?._id;
  const amount = withdrawal.amount;

  if (normalizedStatus === "approved" && userId) {
    await client
      .transaction()
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
        crypto: withdrawal.crypto || "USDT",
        amount,
        walletAddress: withdrawal.walletAddress,
        date: new Date(),
      });

      await client.patch(id).set({ emailSuccessSent: true }).commit();
    }
  }

  if (normalizedStatus === "rejected" && userId) {
    await client
      .transaction()
      .patch(userId, {
        inc: {
          reservedProfit: -amount,
          availableProfit: amount, // ✅ RETURN the funds to the user
        },
      })
      .commit();

    if (!withdrawal.emailRejectedSent) {
      await sendWithdrawalRejectedEmail({
        email: withdrawal.user.email,
        name: withdrawal.user.username.split(" ")[0],
        crypto: withdrawal.crypto || "USDT",
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
      status: normalizedStatus,
      updatedAt: new Date().toISOString(),
    })
    .commit();

  return sendResponse(res, true, `Withdrawal status updated to ${normalizedStatus} successfully`, 200);
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






// import { client } from "../../sanity.js";

// export async function approveWithdrawal(withdrawalId) {
//   const withdrawal = await client.fetch(
//     `*[_type=="withdrawal" && _id==$id][0]{
//       _id,
//       status,
//       amount,
//       user->{ _id }
//     }`,
//     { id: withdrawalId }
//   );

//   if (!withdrawal || withdrawal.status !== "pending") {
//     throw new Error("Invalid withdrawal");
//   }

//   const userId = withdrawal.user._id;
//   const amount = Number(withdrawal.amount) || 0;

//   await client
//     .transaction()
//     .patch(withdrawalId, {
//       set: {
//         status: "approved",
//         updatedAt: new Date().toISOString(),
//       },
//     })
//     .patch(userId, {
//       inc: {
//         // ✅ ONLY release reserved funds
//         reservedProfit: -amount,
//       },
//     })
//     .commit();

//   return true;
// }


// import { client } from "../../sanity.js";

// export async function rejectWithdrawal(withdrawalId) {
//   const withdrawal = await client.fetch(
//     `*[_type=="withdrawal" && _id==$id][0]`,
//     { id: withdrawalId }
//   );

//   if (!withdrawal || withdrawal.status !== "pending") {
//     throw new Error("Invalid withdrawal");
//   }

//   const userId = withdrawal.user._ref;
//   const amount = withdrawal.amount;

//   await client
//     .transaction()
//     .patch(withdrawalId, {
//       set: {
//         status: "rejected",
//         updatedAt: new Date().toISOString(),
//       },
//     })
// .patch(userId, {
//   inc: {
//     reservedProfit: -Number(amount || 0),
//   },
// })
//     .commit();

//   return true;
// }