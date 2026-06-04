import { client } from "../lib/sanity.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { sendResponse } from "../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../lib/pagination.js";
import { 
  sendDepositSuccessEmail, 
  sendDepositRejectedEmail 
} from "../lib/mailer.js";

export const getDepositsController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);
  const search = req.query.search?.trim();
  const status = req.query.status?.trim();

  const searchFilter = search ? ` && (_id match $search || crypto match $search || status match $search || user->username match $search || user->email match $search)` : "";
  const statusFilter = status && status !== "all" ? ` && status == "${status}"` : "";
  const searchParam = search ? `${search}*` : "";

  const query = `
    *[_type == "deposit" && status != "initiated"${searchFilter}${statusFilter}]
    | order(createdAt desc)
    [$start...$end]{
      _id,
      amount,
      status,
      fundedAt,
      crypto,
      "proofOfPayment": proofOfPayment.asset->url,
      "user": {
        "_id": user->_id,
        "username": user->username,
        "email": user->email
      }
    }
  `;

  const [deposits, total] = await Promise.all([
    client.fetch(query, { start, end, search: searchParam }),
    client.fetch(`count(*[_type == "deposit" && status != "initiated"${searchFilter}${statusFilter}])`, { search: searchParam }),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Deposits fetched successfully", 200, {
    records: deposits,
    pagination,
  });
});



export const getDepositByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deposit = await client.fetch(
    `*[_type == "deposit" && _id == $id][0]{
      _id,
      amount,
      crypto,
      status,
      fundedAt,
      _updatedAt,
      "proofOfPayment": proofOfPayment.asset->url,
      "user": user->{
        _id,
        username,
        email,
        phoneNumber,
        accountStatus,
        accountBalance,
        createdAt,
        _updatedAt
      }
    }`,
    { id }
  );

  if (!deposit) {
    return sendResponse(res, false, "Deposit not found", 404);
  }

  return sendResponse(res, true, "Deposit fetched successfully", 200, deposit);
});

// PATCH — Update Deposit Status
export const updateDepositStatusController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["successful", "failed", "approved", "rejected"];
  if (!allowedStatuses.includes(status)) {
    return sendResponse(res, false, "Invalid status", 400);
  }

  const deposit = await client.fetch(
    `*[_type=="deposit" && _id==$id][0]{
      _id,
      amount,
      status,
      crypto,
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

  if (!deposit) {
    return sendResponse(res, false, "Deposit not found", 404);
  }

  const normalizedStatus = (status === "approved" || status === "successful") ? "successful" : (status === "rejected" || status === "failed") ? "failed" : status;

  if (deposit.status === "successful" || deposit.status === "approved") {
    return sendResponse(res, false, "Deposit already processed", 400);
  }

  // Update user balance if successful
  if (normalizedStatus === "successful" && deposit.user?._id) {
    const newBalance = (deposit.user.accountBalance || 0) + deposit.amount;
    await client.patch(deposit.user._id).set({ accountBalance: newBalance }).commit();
  }

  // Update deposit status
  await client.patch(id).set({ status: normalizedStatus, updatedAt: new Date().toISOString() }).commit();

  // Send emails idempotently
  if (normalizedStatus === "successful" && !deposit.emailSuccessSent && deposit.user?.email) {
    await sendDepositSuccessEmail({
      email: deposit.user.email,
      name: deposit.user.username.split(" ")[0],
      amount: deposit.amount,
      method: deposit.crypto || "USDT",
      reference: deposit._id,
      date: new Date(),
    });
    await client.patch(id).set({ emailSuccessSent: true }).commit();
  }

  if (normalizedStatus === "failed" && !deposit.emailRejectedSent && deposit.user?.email) {
    await sendDepositRejectedEmail({
      email: deposit.user.email,
      name: deposit.user.username.split(" ")[0],
      amount: deposit.amount,
      reason: "Deposit verification failed",
      reference: deposit._id,
      date: new Date(),
    });
    await client.patch(id).set({ emailRejectedSent: true }).commit();
  }

  return sendResponse(res, true, `Deposit marked as ${normalizedStatus}`, 200);
});

// DELETE — Remove Deposit
export const deleteDepositController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deposit = await client.fetch(`*[_type == "deposit" && _id == $id][0]`, { id });

  if (!deposit) {
    return sendResponse(res, false, "Deposit not found", 404);
  }

  await client.delete(id);

  return sendResponse(res, true, "Deposit deleted successfully", 200);
});
