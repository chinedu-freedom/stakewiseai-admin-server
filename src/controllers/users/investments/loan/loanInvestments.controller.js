import { client } from "../../../../lib/sanity.js";
import { sendResponse } from "../../../../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../../../../lib/pagination.js";
import { asyncHandler } from "../../../../lib/asyncHandler.js";

export const getLoanInvestmentsController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `
    *[
      _type == "userInvestment" &&
      planType == "loan"
    ]
    | order(createdAt desc)
    [$start...$end] {
      _id,
      amount,
      interestAmount,
      repaymentDate,
      startDate,
      endDate,
      status,
      createdAt,
      updatedAt,
      planType,
      user->{
        _id,
        fullName,
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
        minAmount,
        maxAmount,
        duration,
        interest,
        status
      }
    }
  `;

  const countQuery = `
    count(*[
      _type == "userInvestment" &&
      planType == "loan"
    ])
  `;

  const [loanInvestments, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(countQuery),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Loan investments fetched successfully", 200, {
    records: loanInvestments,
    pagination,
  });
});


export const updateLoanInvestmentController = async (req, res) => {
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
        planType == "loan"
      ][0]
      `,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Loan investment not found", 404);
    }

    const updated = await client
      .patch(id)
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return sendResponse(res, true, "Loan investment status updated", 200, updated);
  } catch (err) {
    console.error("PATCH_LOAN_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};


export const getSingleLoanInvestmentController = async (req, res) => {
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
        planType == "loan"
      ][0]{
        _id,
        amount,
        interestAmount,
        repaymentDate,
        startDate,
        endDate,
        status,
        createdAt,
        updatedAt,
        planType,
        user->{
          _id,
          fullName,
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
          minAmount,
          maxAmount,
          duration,
          interest,
          status
        }
      }
      `,
      { id }
    );

    if (!investment) {
      return sendResponse(res, false, "Loan investment not found", 404);
    }

    return sendResponse(res, true, "Loan investment fetched successfully", 200, investment);
  } catch (err) {
    console.error("GET_SINGLE_LOAN_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

export const deleteLoanInvestmentController = async (req, res) => {
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
        planType == "loan"
      ][0]
      `,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Loan investment not found", 404);
    }

    await client.delete(id);

    return sendResponse(res, true, "Loan investment deleted successfully", 200);
  } catch (err) {
    console.error("DELETE_LOAN_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};
