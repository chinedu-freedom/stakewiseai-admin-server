import slugify from "slugify";
import { v4 as uuid } from "uuid";
import { client } from "../../../lib/sanity.js";
import { sendResponse } from "../../../lib/response.js";
import { uploadImage } from "../../../lib/uploadImage.js";

const statusMap = {
  active: "active",
  inactive: "inactive",
  completed: "completed",
};

const allowedTypes = ["stock", "bond"];

export const createStockBondPlanController = async (req, res) => {
  try {
    const {
      title,
      type: rawType,
      status: rawStatus,
      unitHeld,
      changePercent,
      currentPrice,
    } = req.body;

    const type = rawType?.trim().toLowerCase();
    const status = rawStatus?.trim().toLowerCase();
    const imageFile = req.file;

    // Validation
    switch (true) {
      case !title?.trim():
        return sendResponse(res, false, "Title is required", 400);

      case !type || !allowedTypes.includes(type):
        return sendResponse(res, false, "Type must be 'stock' or 'bond'", 400);

      case isNaN(unitHeld) || Number(unitHeld) < 1:
        return sendResponse(res, false, "Unit held must be at least 1", 400);

      case isNaN(changePercent) || Number(changePercent) < -100:
        return sendResponse(res, false, "Change percentage must be at least -100", 400);

      case isNaN(currentPrice) || Number(currentPrice) < 200:
        return sendResponse(res, false, "Current price must be at least $200", 400);

      case !status || !Object.keys(statusMap).includes(status):
        return sendResponse(res, false, "Invalid status value", 400);

      case !imageFile:
        return sendResponse(res, false, "Image is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="stockBondPlan" && title==$title][0]`,
      { title: title.trim() }
    );

    if (existingPlan) {
      return sendResponse(
        res,
        false,
        "Stock/Bond Plan with this title already exists",
        409
      );
    }

    const uploadedImageId = await uploadImage(
      imageFile,
      slugify(title, { lower: true, strict: true })
    );

    const stockBondInvestment = await client.fetch(
      `*[_type=="investment" && type=="stockBond"][0]`
    );

    if (!stockBondInvestment) {
      return sendResponse(
        res,
        false,
        "Stock/Bond investment type not found",
        404
      );
    }

    const createdPlan = await client.create({
      _type: "stockBondPlan",
      title: title.trim(),
      type,
      unitHeld: Number(unitHeld),
      changePercent: Number(changePercent),
      currentPrice: Number(currentPrice),
      status: statusMap[status],
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: uploadedImageId },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await client
      .patch(stockBondInvestment._id)
      .setIfMissing({ plans: [] })
      .append("plans", [{ _type: "reference", _ref: createdPlan._id, _key: uuid() }])
      .commit();

    return sendResponse(
      res,
      true,
      "Stock/Bond Plan created successfully",
      201,
      createdPlan
    );
  } catch (error) {
    console.error("CREATE_STOCKBOND_PLAN_ERROR:", error);
    return sendResponse(res, false, "Failed to create Stock/Bond Plan", 500, error.message);
  }
};


// GET ALL STOCK / BOND PLANS
export const getStockBondPlansController = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    const plans = await client.fetch(
      `*[_type=="stockBondPlan"] | order(createdAt desc)[$start...$end]`,
      { start, end }
    );

    const total = await client.fetch(
      `count(*[_type=="stockBondPlan"])`
    );

    return sendResponse(res, true, "Stock/Bond Plans fetched successfully", 200, {
      plans,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET_STOCKBOND_PLANS_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

// GET SINGLE STOCK/BOND PLAN
export const getSingleStockBondPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const plan = await client.fetch(
      `*[_type=="stockBondPlan" && _id==$id][0]`,
      { id }
    );

    if (!plan) {
      return sendResponse(res, false, "Stock/Bond Plan not found", 404);
    }

    return sendResponse(res, true, "Stock/Bond Plan fetched successfully", 200, plan);
  } catch (err) {
    console.error("GET_SINGLE_STOCKBOND_PLAN_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

export const updateStockBondPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="stockBondPlan" && _id==$id][0]`,
      { id }
    );

    if (!existingPlan) {
      return sendResponse(res, false, "Stock/Bond Plan not found", 404);
    }

    const {
      title: rawTitle,
      type: rawType,
      status: rawStatus,
      unitHeld: rawUnitHeld,
      changePercent: rawChangePercent,
      currentPrice: rawCurrentPrice,
    } = req.body;

    const title = rawTitle?.trim() || existingPlan.title;
    const type = rawType?.trim().toLowerCase() || existingPlan.type;
    const status = rawStatus?.trim().toLowerCase() || existingPlan.status;
    const unitHeld = rawUnitHeld !== undefined ? Number(rawUnitHeld) : existingPlan.unitHeld;
    const changePercent = rawChangePercent !== undefined ? Number(rawChangePercent) : existingPlan.changePercent;
    const currentPrice = rawCurrentPrice !== undefined ? Number(rawCurrentPrice) : existingPlan.currentPrice;
    const imageFile = req.file;

    // Validation
    switch (true) {
      case !title:
        return sendResponse(res, false, "Title is required", 400);
      case !type || !allowedTypes.includes(type):
        return sendResponse(res, false, "Type must be 'stock' or 'bond'", 400);
      case isNaN(unitHeld) || unitHeld < 1:
        return sendResponse(res, false, "Unit held must be at least 1", 400);
      case isNaN(changePercent) || changePercent < -100:
        return sendResponse(res, false, "Change percentage must be at least -100", 400);
      case isNaN(currentPrice) || currentPrice < 200:
        return sendResponse(res, false, "Current price must be at least $200", 400);
      case !status || !Object.keys(statusMap).includes(status):
        return sendResponse(res, false, "Status must be 'active', 'inactive', or 'completed'", 400);
    }

    // Check for duplicate title
    const duplicate = await client.fetch(
      `*[_type=="stockBondPlan" && title==$title && _id!=$id][0]`,
      { title, id }
    );
    if (duplicate) {
      return sendResponse(res, false, "Another plan with this title already exists", 409);
    }

    // Upload new image if provided
    let uploadedImageId = existingPlan.image?.asset?._ref;
    if (imageFile) {
      uploadedImageId = await uploadImage(
        imageFile,
        slugify(title, { lower: true, strict: true })
      );
    }

    const updatedPlan = await client
      .patch(id)
      .set({
        title,
        type,
        unitHeld,
        changePercent,
        currentPrice,
        status: statusMap[status],
        image: uploadedImageId
          ? { _type: "image", asset: { _type: "reference", _ref: uploadedImageId } }
          : existingPlan.image,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return sendResponse(res, true, "Stock/Bond Plan updated successfully", 200, updatedPlan);
  } catch (error) {
    console.error("PATCH_STOCKBOND_PLAN_ERROR:", error);
    return sendResponse(res, false, "Failed to update Stock/Bond Plan", 500, error.message);
  }
};

// DELETE STOCK/BOND PLAN
export const deleteStockBondPlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="stockBondPlan" && _id==$id][0]`,
      { id }
    );
    if (!existingPlan) {
      return sendResponse(res, false, "Plan not found", 404);
    }

    const parentInvestment = await client.fetch(
      `*[_type=="investment" && type=="stockBond" && references($id)][0]`,
      { id }
    );

    if (parentInvestment) {
      await client
        .patch(parentInvestment._id)
        .unset([`plans[_ref == "${id}"]`])
        .commit({ autoGenerateArrayKeys: true });
    }

    await client.delete(id);

    return sendResponse(res, true, "Stock/Bond Plan deleted successfully", 200);
  } catch (err) {
    console.error("DELETE_STOCKBOND_PLAN_ERROR:", err);
    return sendResponse(res, false, "Internal Server Error", 500, err.message);
  }
};
