import { client } from "../../../lib/sanity.js";
import { sendResponse } from "../../../lib/response.js";
import { v4 as uuid } from "uuid";
import { getPaginationParams, buildPaginationMeta } from "../../../lib/pagination.js";
import { asyncHandler } from "../../../lib/asyncHandler.js";

const statusMap = {
  Active: "active",
  Inactive: "inactive",
  Completed: "completed",
};

// CREATE LOAN PLAN
export const createLoanPlanController = async (req, res) => {
  try {
    const {
      title,
      interest,
      duration,
      minAmount,
      maxAmount,
      status: statusLabel,
    } = req.body;

    if (!title)
      return sendResponse(res, false, "Loan title is required", 400);

    if (interest === undefined || isNaN(interest) || interest < 10)
      return sendResponse(res, false, "Interest must be at least 10%", 400);

    if (duration === undefined || isNaN(duration) || duration < 30)
      return sendResponse(res, false, "Duration must be at least 30 days", 400);

    if (minAmount === undefined || isNaN(minAmount) || minAmount < 2000)
      return sendResponse(
        res,
        false,
        "Minimum loan amount must be at least 2000",
        400
      );

    if (maxAmount === undefined || isNaN(maxAmount))
      return sendResponse(res, false, "Maximum loan amount is required", 400);

    if (minAmount > maxAmount)
      return sendResponse(
        res,
        false,
        "Minimum amount cannot exceed maximum amount",
        400
      );

    const status = statusMap[statusLabel];
    if (!status)
      return sendResponse(res, false, `Invalid status: ${statusLabel}`, 400);

    const loanInvestment = await client.fetch(
      `*[_type == "investment" && type == "loan"][0]`
    );

    if (!loanInvestment) {
      return sendResponse(
        res,
        false,
        "Loan investment type not found",
        404
      );
    }

    const existing = await client.fetch(
      `*[_type == "loanPlan" && title == $title][0]`,
      { title: title.trim() }
    );

    if (existing) {
      return sendResponse(
        res,
        false,
        "Loan Plan with this title already exists",
        409
      );
    }

    const created = await client.create({
      _type: "loanPlan",
      title: title.trim(),
      interest,
      duration,
      minAmount,
      maxAmount,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await client
      .patch(loanInvestment._id)
      .setIfMissing({ plans: [] })
      .append("plans", [
        { _type: "reference", _ref: created._id, _key: uuid() },
      ])
      .commit();

    return sendResponse(
      res,
      true,
      "Loan Plan created successfully",
      201,
      created
    );
  } catch (err) {
    console.error("CREATE_LOAN_PLAN_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500);
  }
};
export const getLoanPlansController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `
    *[_type == "loanPlan"]
    | order(createdAt desc)
    [$start...$end]
  `;

  const countQuery = `
    count(*[_type == "loanPlan"])
  `;

  const [loanPlans, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(countQuery),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Loan plans fetched successfully", 200, {
    records: loanPlans,
    pagination,
  });
});

// GET single loan plan
export const getLoanPlanByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Loan plan ID is required", 400);
    }

    const plan = await client.fetch(
      `*[_type=="loanPlan" && _id==$id][0]`,
      { id }
    );

    if (!plan) {
      return sendResponse(res, false, "Loan plan not found", 404);
    }

    return sendResponse(res, true, "Loan plan fetched successfully", 200, plan);
  } catch (error) {
    console.error("GET_SINGLE_LOAN_PLAN_ERROR:", error);
    return sendResponse(res, false, "Something went wrong", 500, error.message);
  }
};

// UPDATE loan plan
export const updateLoanPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Loan plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="loanPlan" && _id==$id][0]`,
      { id }
    );

    if (!existingPlan) {
      return sendResponse(res, false, "Loan plan not found", 404);
    }

    const {
      title = existingPlan.title,
      interest = existingPlan.interest,
      duration = existingPlan.duration,
      minAmount = existingPlan.minAmount,
      maxAmount = existingPlan.maxAmount,
      status = existingPlan.status,
    } = req.body;

    switch (true) {
      case !title:
        return sendResponse(res, false, "Title is required", 400);
      case interest < 10:
        return sendResponse(res, false, "Interest must be at least 10%", 400);
      case duration < 30:
        return sendResponse(res, false, "Duration must be at least 30 days", 400);
      case minAmount < 2000:
        return sendResponse(res, false, "Minimum amount must be at least 2000", 400);
      case maxAmount <= minAmount:
        return sendResponse(res, false, "Maximum amount must be greater than minimum amount", 400);
      case !["Active", "Inactive", "Completed", "active", "inactive", "completed"].includes(status):
        return sendResponse(res, false, "Invalid status value", 400);
    }

    const updated = await client
      .patch(id)
      .set({
        title: title.trim(),
        interest,
        duration,
        minAmount,
        maxAmount,
        status,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return sendResponse(res, true, "Loan plan updated successfully", 200, updated);
  } catch (error) {
    console.error("UPDATE_LOAN_PLAN_ERROR:", error);
    return sendResponse(res, false, "Something went wrong", 500, error.message);
  }
};

// DELETE loan plan
export const deleteLoanPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Loan plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="loanPlan" && _id==$id][0]`,
      { id }
    );

    if (!existingPlan) {
      return sendResponse(res, false, "Loan plan not found", 404);
    }

    const relatedInvestments = await client.fetch(
      `*[_type=="investment" && type=="loan" && references($id)]{_id}`,
      { id }
    );

    for (const inv of relatedInvestments) {
      await client
        .patch(inv._id)
        .unset([`plans[_ref=="${id}"]`])
        .commit();
    }

    await client.delete(id);

    return sendResponse(res, true, "Loan plan deleted successfully", 200);
  } catch (error) {
    console.error("DELETE_LOAN_PLAN_ERROR:", error);
    return sendResponse(res, false, "Something went wrong", 500, error.message);
  }
};
