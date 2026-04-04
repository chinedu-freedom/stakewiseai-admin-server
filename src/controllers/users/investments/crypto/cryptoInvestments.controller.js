import { client } from "../../../../lib/sanity.js";
import { sendResponse } from "../../../../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../../../../lib/pagination.js";
import { asyncHandler } from "../../../../lib/asyncHandler.js";

export const getCryptoInvestmentsController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `
    *[
      _type == "userInvestment" &&
      planType == "crypto"
    ]
    | order(createdAt desc)
    [$start...$end] {
      _id,
      amount,
      status,
      createdAt,
      updatedAt,
      planType,
      user->{
        _id,
        userName,
        email,
        phoneNumber,
        accountStatus,
        accountBalance,
        emailVerified,
        _createdAt,
        _updatedAt
      },
      plan->{
        _id,
        title,
        minDeposit,
        maxDeposit,
        contractDuration,
        dailyProfit,
        status
      }
    }
  `;

  const countQuery = `
    count(*[
      _type == "userInvestment" &&
      planType == "crypto"
    ])
  `;

  const [cryptoInvestments, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(countQuery),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Crypto investments fetched successfully", 200, {
    records: cryptoInvestments,
    pagination,
  });
});

// GET single crypto investment by ID
export const getSingleCryptoInvestmentController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Investment ID is required", 400);
    }

    const investment = await client.fetch(
      `
      *[
        _type == "userInvestment" &&
        _id == $id &&
        planType == "crypto"
      ][0]{
        _id,
        amount,
        status,
        planType,
        createdAt,
        updatedAt,
        user->{
          _id,
          userName,
          email,
          phoneNumber,
          accountStatus,
          accountBalance,
          emailVerified,
          _createdAt,
          _updatedAt
        },
        plan->{
          _id,
          title,
          minDeposit,
          maxDeposit,
          contractDuration,
          dailyProfit,
          status
        }
      }
      `,
      { id }
    );

    if (!investment) {
      return sendResponse(res, false, "Crypto investment not found", 404);
    }

    return sendResponse(res, true, "Crypto investment fetched successfully", 200, investment);
  } catch (err) {
    console.error("GET_SINGLE_CRYPTO_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

// PATCH crypto investment status
export const updateCryptoInvestmentStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return sendResponse(res, false, "Investment ID is required", 400);
    }

    if (!status) {
      return sendResponse(res, false, "Status is required", 400);
    }

    const allowedStatuses = ["pending", "active", "completed", "cancelled", "failed"];
    if (!allowedStatuses.includes(status)) {
      return sendResponse(
        res,
        false,
        `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
        400
      );
    }

    const existing = await client.fetch(
      `
      *[
        _type == "userInvestment" &&
        _id == $id &&
        planType == "crypto"
      ][0]
      `,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Crypto investment not found", 404);
    }

    const updated = await client
      .patch(id)
      .set({ status, updatedAt: new Date().toISOString() })
      .commit();

    return sendResponse(res, true, "Crypto investment status updated", 200, updated);
  } catch (err) {
    console.error("PATCH_CRYPTO_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

// DELETE crypto investment by ID
export const deleteCryptoInvestmentController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Investment ID is required", 400);
    }

    const existing = await client.fetch(
      `
      *[
        _type == "userInvestment" &&
        _id == $id &&
        planType == "crypto"
      ][0]
      `,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Crypto investment not found", 404);
    }

    await client.delete(id);

    return sendResponse(res, true, "Crypto investment deleted successfully", 200);
  } catch (err) {
    console.error("DELETE_CRYPTO_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

