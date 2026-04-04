import { client } from "../../../../lib/sanity.js";
import { sendResponse } from "../../../../lib/response.js";
import { buildPaginationMeta } from "../../../../lib/pagination.js";

export const getRealEstateInvestmentsController = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    const query = `
      *[
        _type == "userInvestment" &&
        planType == "realEstate"
      ]
      | order(createdAt desc)
      [$start...$end] {
        _id,
        amount,
        expectedROI,
        startDate,
        endDate,
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
          location,
          rioEstimate,
          contractDuration,
          minInvestment,
          image
        }
      }
    `;

    const countQuery = `
      count(*[
        _type == "userInvestment" &&
        planType == "realEstate"
      ])
    `;

    const [realEstateInvestments, total] = await Promise.all([
      client.fetch(query, { start, end }),
      client.fetch(countQuery),
    ]);

    const meta = buildPaginationMeta(total, page, limit);

    return sendResponse(res, true, "Real estate investments fetched successfully", 200, {
      data: realEstateInvestments,
      meta,
    });
  } catch (err) {
    console.error("GET_REAL_ESTATE_INVESTMENTS_ERROR:", err);
    return sendResponse(res, false, "Failed to fetch real estate investments", 500, err.message);
  }
};


// Get single real estate investment by ID
export const getSingleRealEstateInvestmentController = async (req, res) => {
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
        planType == "realEstate"
      ][0]{
        _id,
        amount,
        expectedROI,
        startDate,
        endDate,
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
          location,
          contractDuration,
          minInvestment,
          image
        }
      }
      `,
      { id }
    );

    if (!investment) {
      return sendResponse(res, false, "Real estate investment not found", 404);
    }

    return sendResponse(res, true, "Investment fetched successfully", 200, investment);
  } catch (err) {
    console.error("GET_SINGLE_REAL_ESTATE_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

// Update real estate investment status
export const updateRealEstateInvestmentStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) return sendResponse(res, false, "Investment ID is required", 400);
    if (!status) return sendResponse(res, false, "Status is required", 400);

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
        planType == "realEstate"
      ][0]
      `,
      { id }
    );

    if (!existing) return sendResponse(res, false, "Real estate investment not found", 404);

    const updated = await client
      .patch(id)
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return sendResponse(res, true, "Investment status updated", 200, updated);
  } catch (err) {
    console.error("PATCH_REAL_ESTATE_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

// Delete real estate investment
export const deleteRealEstateInvestmentController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return sendResponse(res, false, "Investment ID is required", 400);

    const existing = await client.fetch(
      `
      *[
        _type == "userInvestment" &&
        _id == $id &&
        planType == "realEstate"
      ][0]
      `,
      { id }
    );

    if (!existing) return sendResponse(res, false, "Real estate investment not found", 404);

    await client.delete(id);

    return sendResponse(res, true, "Investment deleted successfully", 200);
  } catch (err) {
    console.error("DELETE_REAL_ESTATE_INVESTMENT_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};
