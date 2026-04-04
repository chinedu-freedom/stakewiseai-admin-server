import { client } from "../../../../lib/sanity.js";
import { sendResponse } from "../../../../lib/response.js";

// GET paginated Stock/Bond investments
export const getStockBondInvestmentsController = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    const query = `
      *[
        _type == "userInvestment" &&
        planType == "stockBond"
      ]
      | order(createdAt desc)
      [$start...$end] {
        _id,
        amount,
        unitsHeld,
        startDate,
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
          status,
          image,
          currentPrice,
          changePercent,
          type
        }
      }
    `;

    const countQuery = `
      count(*[
        _type == "userInvestment" &&
        planType == "stockBond"
      ])
    `;

    const [stockBondInvestments, total] = await Promise.all([
      client.fetch(query, { start, end }),
      client.fetch(countQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    return sendResponse(res, true, "Stock/Bond investments fetched successfully", 200, {
      investments: stockBondInvestments,
      meta: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("GET_STOCK_BOND_INVESTMENTS_ERROR:", err);
    return sendResponse(res, false, "Failed to fetch stock bond investments", 500, err.message);
  }
};

    
// GET single Stock/Bond investment by ID
export const getSingleStockBondInvestmentController = async (req, res) => {
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
        planType == "stockBond"
      ][0]{
        _id,
        amount,
        unitsHeld,
        startDate,
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
          status,
          image,
          currentPrice,
          changePercent,
          type
        }
      }
      `,
      { id }
    );

    if (!investment) {
      return sendResponse(res, false, "Stock/Bond investment not found", 404);
    }

    return sendResponse(res, true, "Stock/Bond investment fetched successfully", 200, investment);
  } catch (err) {
    console.error("GET_SINGLE_STOCK_BOND_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

// PATCH — update Stock/Bond investment status
export const patchStockBondInvestmentController = async (req, res) => {
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
        planType == "stockBond"
      ][0]
      `,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Stock/Bond investment not found", 404);
    }

    const updated = await client.patch(id).set({
      status,
      updatedAt: new Date().toISOString(),
    }).commit();

    return sendResponse(res, true, "Stock/Bond investment status updated", 200, updated);
  } catch (err) {
    console.error("PATCH_STOCK_BOND_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

// DELETE Stock/Bond investment
export const deleteStockBondInvestmentController = async (req, res) => {
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
        planType == "stockBond"
      ][0]
      `,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Stock/Bond investment not found", 404);
    }

    await client.delete(id);

    return sendResponse(res, true, "Stock/Bond investment deleted successfully", 200);
  } catch (err) {
    console.error("DELETE_STOCK_BOND_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};
