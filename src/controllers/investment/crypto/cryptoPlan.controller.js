import { v4 as uuid } from "uuid";
import { sendResponse } from "../../../lib/response.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../../lib/pagination.js";
import { client } from "../../../lib/sanity.js";
import { asyncHandler } from "../../../lib/asyncHandler.js";

const statusMap = {
  Active: "active",
  Inactive: "inactive",
  Completed: "completed",
};

// CREATE CRYPTO PLAN
export const createCryptoPlanController = async (req, res) => {
  try {
    const {
      title,
      minDeposit,
      maxDeposit,
      dailyProfit,
      contractDuration,
      status: statusLabel,
    } = req.body;

    const status = statusMap[statusLabel?.trim()];

    switch (true) {
      case !title?.trim():
        return sendResponse(res, false, "Plan title is required", 400);

      case minDeposit === undefined || minDeposit < 100:
        return sendResponse(res, false, "Minimum deposit must be at least $100", 400);

      case maxDeposit === undefined || maxDeposit < 1:
        return sendResponse(res, false, "Maximum deposit is required", 400);

      case minDeposit > maxDeposit:
        return sendResponse(
          res,
          false,
          "Minimum deposit cannot exceed maximum deposit",
          400
        );

      case dailyProfit === undefined || dailyProfit < 8:
        return sendResponse(res, false, "Daily profit must be at least 8%", 400);

      case contractDuration === undefined || contractDuration < 1:
        return sendResponse(res, false, "Contract duration must be at least 1 day", 400);

      case !status:
        return sendResponse(
          res,
          false,
          "Status must be Active, Completed or Inactive",
          400
        );
    }

    const planExists = await client.fetch(
      `*[_type=="cryptoPlan" && title==$title][0]`,
      { title: title.trim() }
    );

    if (planExists) {
      return sendResponse(res, false, "Crypto plan already exists", 409);
    }

    const cryptoInvestment = await client.fetch(
      `*[_type == "investment" && type == "crypto"][0]`
    );

    if (!cryptoInvestment) {
      return sendResponse(res, false, "Crypto investment type not found", 404);
    }

    const created = await client.create({
      _type: "cryptoPlan",
      title: title.trim(),
      minDeposit,
      maxDeposit,
      dailyProfit,
      contractDuration,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await client
      .patch(cryptoInvestment._id)
      .setIfMissing({ plans: [] })
      .append("plans", [
        { _type: "reference", _ref: created._id, _key: uuid() },
      ])
      .commit();

    return sendResponse(
      res,
      true,
      "Crypto plan created and linked successfully",
      201,
      created
    );
  } catch (error) {
    console.error("CREATE_CRYPTO_PLAN_ERROR:", error);
    return sendResponse(res, false, "Something went wrong", 500);
  }
};
export const getCryptoPlansController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const whereClause = `_type == "cryptoPlan"`;

  const query = `
    *[${whereClause}]
    | order(createdAt desc)
    [$start...$end]{
      _id,
      title,
      minDeposit,
      maxDeposit,
      dailyProfit,
      contractDuration,
      status,
      createdAt,
      updatedAt
    }
  `;

  const countQuery = `
    count(*[${whereClause}])
  `;

  const [cryptoPlans, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(countQuery),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Crypto plans fetched successfully", 200, {
    records: cryptoPlans,
    pagination,
  });
});


// GET single crypto plan by ID
export const getCryptoPlanByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const plan = await client.fetch(
      `*[_type=="cryptoPlan" && _id==$id][0]`,
      { id }
    );

    if (!plan) {
      return sendResponse(res, false, "Crypto plan not found", 404);
    }

    return sendResponse(
      res,
      true,
      "Crypto plan fetched successfully",
      200,
      plan
    );
  } catch (error) {
    console.error("GET_CRYPTO_PLAN_ERROR:", error);
    return sendResponse(res, false, "Something went wrong", 500);
  }
};

// UPDATE existing crypto plan
export const updateCryptoPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="cryptoPlan" && _id==$id][0]`,
      { id }
    );

    if (!existingPlan) {
      return sendResponse(res, false, "Plan not found", 404);
    }

    const {
      title,
      minDeposit,
      maxDeposit,
      dailyProfit,
      contractDuration,
      status: statusLabel,
    } = req.body;

    const updatedTitle = title?.trim() || existingPlan.title;
    const updatedMinDeposit = minDeposit ?? existingPlan.minDeposit;
    const updatedMaxDeposit = maxDeposit ?? existingPlan.maxDeposit;
    const updatedDailyProfit = dailyProfit ?? existingPlan.dailyProfit;
    const updatedContractDuration =
      contractDuration ?? existingPlan.contractDuration;

    const status =
      statusMap[statusLabel?.trim()] || existingPlan.status;

    if (updatedTitle !== existingPlan.title) {
      const duplicate = await client.fetch(
        `*[_type=="cryptoPlan" && title==$title && _id!=$id][0]`,
        { title: updatedTitle, id }
      );

      if (duplicate) {
        return sendResponse(
          res,
          false,
          "Another plan with this title already exists",
          409
        );
      }
    }

    switch (true) {
      case updatedMinDeposit < 100:
        return sendResponse(
          res,
          false,
          "Minimum deposit must be at least $100",
          400
        );

      case updatedMinDeposit > updatedMaxDeposit:
        return sendResponse(
          res,
          false,
          "Minimum deposit cannot exceed maximum deposit",
          400
        );

      case updatedDailyProfit < 8:
        return sendResponse(
          res,
          false,
          "Daily profit must be at least 8%",
          400
        );

      case updatedContractDuration < 1:
        return sendResponse(
          res,
          false,
          "Contract duration must be at least 1 day",
          400
        );

      case !status:
        return sendResponse(
          res,
          false,
          "Status must be Active, Completed or Inactive",
          400
        );
    }

    const updated = await client
      .patch(id)
      .set({
        title: updatedTitle,
        minDeposit: updatedMinDeposit,
        maxDeposit: updatedMaxDeposit,
        dailyProfit: updatedDailyProfit,
        contractDuration: updatedContractDuration,
        status,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return sendResponse(
      res,
      true,
      "Crypto plan updated successfully",
      200,
      updated
    );
  } catch (error) {
    console.error("PATCH_CRYPTO_PLAN_ERROR:", error);
    return sendResponse(res, false, "Something went wrong", 500);
  }
};

// DELETE crypto plan
export const deleteCryptoPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="cryptoPlan" && _id==$id][0]`,
      { id }
    );

    if (!existingPlan) {
      return sendResponse(res, false, "Crypto plan not found", 404);
    }

    const cryptoInvestment = await client.fetch(
      `*[_type == "investment" && type == "crypto" && references($id)][0]`,
      { id }
    );

    if (cryptoInvestment) {
      await client
        .patch(cryptoInvestment._id)
        .unset([`plans[_ref=="${id}"]`])
        .commit();
    }

    await client.delete(id);

    return sendResponse(
      res,
      true,
      "Crypto plan deleted successfully",
      200
    );
  } catch (error) {
    console.error("DELETE_CRYPTO_PLAN_ERROR:", error);
    return sendResponse(res, false, "Failed to delete crypto plan", 500);
  }
};
