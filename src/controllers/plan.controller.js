import { client } from "../lib/sanity.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { sendResponse } from "../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../lib/pagination.js";


// CREATE INVESTMENT PLAN
export const createInvestmentPlanController = asyncHandler(async (req, res) => {
  const {
    title,
    minDeposit,
    maxDeposit,
    dailyProfit,
    contractDuration,
    isFixedDeposit = false,
    status,
  } = req.body;

  const errors = [];

  // Basic validation
  if (!title) errors.push("Title is required");
  if (minDeposit === undefined || minDeposit < 0)
    errors.push("Minimum deposit must be ≥ 0");
  if (maxDeposit === undefined || maxDeposit < 0)
    errors.push("Maximum deposit must be ≥ 0");
  if (dailyProfit === undefined || dailyProfit < 0)
    errors.push("Daily profit must be ≥ 0");
  if (contractDuration === undefined || contractDuration < 1)
    errors.push("Contract duration must be at least 1 day");
  if (!status) errors.push("Status is required");

  // Logical validation
  if (minDeposit > maxDeposit) {
    errors.push("Minimum deposit cannot be greater than maximum deposit");
  }

  if (!["active", "inactive"].includes(status)) {
    errors.push(`Invalid status: ${status}`);
  }

  if (errors.length > 0) {
    return sendResponse(res, false, "Validation failed", 400, { errors });
  }

  // Prevent duplicate plan title
  const existing = await client.fetch(
    `*[_type=="plan" && title==$title][0]`,
    { title }
  );

  if (existing) {
    return sendResponse(res, false, "Investment plan already exists", 409);
  }

  const now = new Date().toISOString();

  const created = await client.create({
    _type: "plan",
    title,
    minDeposit,
    maxDeposit,
    dailyProfit,
    contractDuration,
    isFixedDeposit,
    status,
    createdAt: now,
    updatedAt: now,
  });

  return sendResponse(
    res,
    true,
    "Investment plan created successfully",
    201,
    created
  );
});

// GET ALL INVESTMENT PLANS (PAGINATED)
export const getInvestmentPlansController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `
    *[_type == "plan"] | order(createdAt desc) [$start...$end] {
      _id,
      title,
      minDeposit,
      maxDeposit,
      dailyProfit,
      contractDuration,
      isFixedDeposit,
      status,
      createdAt,
      updatedAt
    }
  `;

  const countQuery = `count(*[_type == "plan"])`;

  const [plans, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(countQuery),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return sendResponse(
    res,
    true,
    "Investment plans fetched successfully",
    200,
    plans,
    meta
  );
});

export const getInvestmentPlanByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Investment plan ID is required", 400);
    }

    const investment = await client.fetch(
      `*[_type == "plan" && _id == $id][0]{
        _id,
        title,
        minDeposit,
        maxDeposit,
        dailyProfit,
        contractDuration,
        isFixedDeposit,
        status,
        createdAt,
        updatedAt
      }`,
      { id }
    );

    if (!investment) {
      return sendResponse(res, false, "Investment plan not found", 404);
    }

    return sendResponse(
      res,
      true,
      "Investment plan fetched successfully",
      200,
      investment
    );
  } catch (error) {
    console.error("GET_INVESTMENT_ERROR:", error);
    return sendResponse(res, false, "Failed to fetch investment plan", 500);
  }
};

export const updateInvestmentPlanController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendResponse(res, false, "Investment plan ID is required", 400);
  }

  const existing = await client.fetch(
    `*[_type=="plan" && _id==$id][0]`,
    { id }
  );

  if (!existing) {
    return sendResponse(res, false, "Investment plan not found", 404);
  }

  const {
    title,
    minDeposit,
    maxDeposit,
    dailyProfit,
    contractDuration,
    isFixedDeposit,
    status,
  } = req.body;

  const errors = [];

  // Validation + fallback to existing values
  const finalTitle = title?.trim() || existing.title;
  const finalMinDeposit =
    minDeposit !== undefined ? Number(minDeposit) : existing.minDeposit;
  const finalMaxDeposit =
    maxDeposit !== undefined ? Number(maxDeposit) : existing.maxDeposit;
  const finalDailyProfit =
    dailyProfit !== undefined ? Number(dailyProfit) : existing.dailyProfit;
  const finalDuration =
    contractDuration !== undefined
      ? Number(contractDuration)
      : existing.contractDuration;
  const finalIsFixedDeposit =
    isFixedDeposit !== undefined
      ? Boolean(isFixedDeposit)
      : existing.isFixedDeposit;
  const finalStatus = status || existing.status;

  // Field validations
  if (!finalTitle) errors.push("Title is required");

  if (finalMinDeposit < 0)
    errors.push("Minimum deposit must be ≥ 0");

  if (finalMaxDeposit < 0)
    errors.push("Maximum deposit must be ≥ 0");

  if (finalMinDeposit > finalMaxDeposit)
    errors.push("Minimum deposit cannot be greater than maximum deposit");

  if (finalDailyProfit < 0)
    errors.push("Daily profit must be ≥ 0");

  if (finalDuration < 1)
    errors.push("Contract duration must be at least 1 day");

  if (!["active", "inactive"].includes(finalStatus)) {
    errors.push(`Invalid status: ${finalStatus}`);
  }

  if (errors.length > 0) {
    return sendResponse(res, false, "Validation failed", 400, { errors });
  }

  // Update document
  await client
    .patch(id)
    .set({
      title: finalTitle,
      minDeposit: finalMinDeposit,
      maxDeposit: finalMaxDeposit,
      dailyProfit: finalDailyProfit,
      contractDuration: finalDuration,
      isFixedDeposit: finalIsFixedDeposit,
      status: finalStatus,
      updatedAt: new Date().toISOString(),
    })
    .commit();

  return sendResponse(
    res,
    true,
    "Investment plan updated successfully",
    200
  );
});

export const deleteInvestmentPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Investment plan ID is required", 400);
    }

    const existing = await client.fetch(
      `*[_type=="plan" && _id==$id][0]`,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Investment plan not found", 404);
    }

    // 🔍 Check for existing references (e.g., userInvestments)
    // Sanity prevents deletion if other documents reference this plan.
    // We will find all documents referencing this ID and unset the reference.
    const references = await client.fetch(
      `*[references($id)]{ _id, _type }`,
      { id }
    );

    if (references.length > 0) {
      console.log(`Found ${references.length} references to plan ${id}. Cleaning up...`);
      
      const transaction = client.transaction();
      
      references.forEach((ref) => {
        // For userInvestments, we might want to unset the plan reference 
        // or handle it based on your business logic. 
        // Here we unset the field that points to the plan.
        transaction.patch(ref._id, (p) => p.unset(['plan']));
      });

      await transaction.commit();
    }

    // Now delete the plan
    await client.delete(id);

    return sendResponse(
      res,
      true,
      "Investment plan and associated references cleaned up successfully",
      200
    );
  } catch (error) {
    console.error("DELETE_INVESTMENT_ERROR:", error);
    
    // Check if it's a Sanity referential integrity error
    if (error.message?.includes("cannot be deleted as there are references")) {
       return sendResponse(res, false, "Cannot delete plan: It is still being referenced by active investments. Please archive or remove those investments first.", 409);
    }

    return sendResponse(res, false, "Failed to delete investment plan", 500);
  }
};