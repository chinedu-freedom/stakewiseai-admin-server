import { client } from "../../../lib/sanity.js";
import slugify from "slugify";
import { v4 as uuid } from "uuid";
import { sendResponse } from "../../../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../../../lib/pagination.js";
import { uploadImage } from "../../../lib/uploadImage.js";

const statusMap = {
  Active: "active",
  Inactive: "inactive",
  Completed: "completed",
};

export const createRealEstatePlanController = async (req, res) => {
  try {
    const {
      title,
      location,
      roiEstimate,
      contractDuration,
      minInvestment,
      status: statusLabel,
    } = req.body;

    const imageFile = req.file;
    const status = statusMap[statusLabel?.trim()];

    switch (true) {
      case !title?.trim():
        return sendResponse(res, false, "Title is required", 400);
      case !imageFile:
        return sendResponse(res, false, "Image is required", 400);
      case !location?.trim():
        return sendResponse(res, false, "Location is required", 400);
      case isNaN(roiEstimate) || Number(roiEstimate) < 10:
        return sendResponse(res, false, "ROI estimate must be at least 10%", 400);
      case isNaN(contractDuration) || Number(contractDuration) < 30:
        return sendResponse(
          res,
          false,
          "Investment period must be at least 30 days",
          400
        );
      case isNaN(minInvestment) || Number(minInvestment) < 2500:
        return sendResponse(
          res,
          false,
          "Minimum investment must be at least $2500",
          400
        );
      case !status:
        return sendResponse(
          res,
          false,
          "Status must be Active, Inactive, or Completed",
          400
        );
    }

    const realEstateInvestment = await client.fetch(
      `*[_type=="investment" && type=="realEstate"][0]`
    );

    if (!realEstateInvestment) {
      return sendResponse(res, false, "Real Estate investment type not found", 404);
    }

    const existingPlan = await client.fetch(
      `*[_type=="realEstatePlan" && title==$title][0]`,
      { title: title.trim() }
    );

    if (existingPlan) {
      return sendResponse(
        res,
        false,
        "Real Estate Plan with this title already exists",
        409
      );
    }

    const slug = slugify(title, { lower: true, strict: true });
    const imageAssetId = await uploadImage(imageFile, slug);

    const createdPlan = await client.create({
      _type: "realEstatePlan",
      title: title.trim(),
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: imageAssetId },
      },
      location: location.trim(),
      roiEstimate: Number(roiEstimate),
      contractDuration: Number(contractDuration),
      minInvestment: Number(minInvestment),
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await client
      .patch(realEstateInvestment._id)
      .setIfMissing({ plans: [] })
      .append("plans", [{ _type: "reference", _ref: createdPlan._id, _key: uuid() }])
      .commit();

    return sendResponse(
      res,
      true,
      "Real Estate Plan created successfully",
      201,
      createdPlan
    );
  } catch (error) {
    console.error("CREATE_REAL_ESTATE_PLAN_ERROR:", error);
    return sendResponse(res, false, "Failed to create Real Estate Plan", 500, error.message);
  }
};


// GET ALL REAL ESTATE PLANS
export const getRealEstatePlansController = async (req, res) => {
  try {
    const { page, limit, start, end } = getPaginationParams(req);

    const plans = await client.fetch(
      `*[_type == "realEstatePlan"] | order(createdAt desc) [${start}...${end}]`
    );

    const total = await client.fetch(
      `count(*[_type == "realEstatePlan"])`
    );

    return sendResponse(
      res,
      true,
      "Real Estate Plans fetched successfully",
      200,
      {
        plans,
        meta: buildPaginationMeta(total, page, limit),
      }
    );
  } catch (error) {
    console.error("GET_REAL_ESTATE_PLANS_ERROR:", error);
    return sendResponse(res, false, "Something went wrong", 500, error.message);
  }
};


// GET SINGLE REAL ESTATE PLAN
export const getRealEstatePlanByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const plan = await client.fetch(
      `*[_type=="realEstatePlan" && _id==$id][0]`,
      { id }
    );

    if (!plan) {
      return sendResponse(res, false, "Real Estate Plan not found", 404);
    }

    return sendResponse(
      res,
      true,
      "Real Estate Plan fetched successfully",
      200,
      plan
    );
  } catch (err) {
    console.error("GET_SINGLE_REAL_ESTATE_PLAN_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};

export const updateRealEstatePlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="realEstatePlan" && _id==$id][0]`,
      { id }
    );

    if (!existingPlan) {
      return sendResponse(res, false, "Real Estate Plan not found", 404);
    }

    const {
      title,
      location,
      roiEstimate,
      contractDuration,
      minInvestment,
      status: statusLabel,
    } = req.body;

    const updatedTitle = title?.trim() || existingPlan.title;
    const updatedLocation = location?.trim() || existingPlan.location;
    const updatedRoi = roiEstimate !== undefined ? Number(roiEstimate) : existingPlan.roiEstimate;
    const updatedDuration =
      contractDuration !== undefined ? Number(contractDuration) : existingPlan.contractDuration;
    const updatedMinInvestment =
      minInvestment !== undefined ? Number(minInvestment) : existingPlan.minInvestment;

    const status = statusLabel ? statusMap[statusLabel?.trim()] : existingPlan.status;

    // Validation
    switch (true) {
      case !status:
        return sendResponse(res, false, "Status must be Active, Inactive, or Completed", 400);
      case isNaN(updatedRoi) || updatedRoi < 10:
        return sendResponse(res, false, "ROI estimate must be a number >= 10", 400);
      case isNaN(updatedDuration) || updatedDuration < 6:
        return sendResponse(res, false, "Investment period must be a number >= 6", 400);
      case isNaN(updatedMinInvestment) || updatedMinInvestment < 2500:
        return sendResponse(res, false, "Minimum investment must be a number >= 2500", 400);
    }

    // Handle image upload if a new file is provided
    let uploadedImageId = existingPlan.image?.asset?._ref;
    if (req.file) {
      uploadedImageId = await uploadImage(req.file, slugify(updatedTitle, { lower: true, strict: true }));
    }

    const updatedPlan = await client
      .patch(id)
      .set({
        title: updatedTitle,
        image: {
          _type: "image",
          asset: { _type: "reference", _ref: uploadedImageId },
        },
        location: updatedLocation,
        roiEstimate: updatedRoi,
        contractDuration: updatedDuration,
        minInvestment: updatedMinInvestment,
        status,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return sendResponse(res, true, "Real Estate Plan updated successfully", 200, updatedPlan);
  } catch (error) {
    console.error("PATCH_REAL_ESTATE_PLAN_ERROR:", error);
    return sendResponse(res, false, "Failed to update Real Estate Plan", 500, error.message);
  }
};

// DELETE REAL ESTATE PLAN
export const deleteRealEstatePlanController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Plan ID is required", 400);
    }

    const existingPlan = await client.fetch(
      `*[_type=="realEstatePlan" && _id==$id][0]`,
      { id }
    );

    if (!existingPlan) {
      return sendResponse(res, false, "Real Estate Plan not found", 404);
    }

    const investments = await client.fetch(
      `*[_type=="investment" && type=="realEstate" && references($id)]{_id}`,
      { id }
    );

    for (const inv of investments) {
      await client
        .patch(inv._id)
        .unset([`plans[_ref=="${id}"]`])
        .commit();
    }

    await client.delete(id);

    return sendResponse(
      res,
      true,
      "Real Estate Plan deleted successfully",
      200
    );
  } catch (err) {
    console.error("DELETE_REAL_ESTATE_PLAN_ERROR:", err);
    return sendResponse(res, false, "Something went wrong", 500, err.message);
  }
};
