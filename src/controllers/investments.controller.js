import { client } from "../lib/sanity.js";
import slugify from "slugify";
import { asyncHandler } from "../lib/asyncHandler.js";
import { sendResponse } from "../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../lib/pagination.js";
import { uploadImage } from "../lib/uploadImage.js";

const typeMap = {
  "Crypto": "crypto",
  "Real Estate": "realEstate",
  "Loan": "loan",
  "Stock & Bond": "stockBond",
  // "Stocks & Bonds": "stockBond",
};

const statusMap = {
  "Active": "active",
  "Inactive": "inactive",
};
// CREATE INVESTMENT
export const createInvestmentController = asyncHandler(async (req, res) => {
  const { title, type: typeLabel, status: statusLabel } = req.body;
  const imageFile = req.file; // multer single file

  const errors = [];

  if (!title) errors.push("Title is required");
  if (!typeLabel) errors.push("Investment type is required");
  if (!imageFile) errors.push("Image file is required");
  if (!statusLabel) errors.push("Status is required");

  const type = typeMap[typeLabel];
  const status = statusMap[statusLabel];

  if (typeLabel && !type) errors.push(`Invalid investment type: ${typeLabel}`);
  if (statusLabel && !status) errors.push(`Invalid investment status: ${statusLabel}`);

  if (errors.length > 0) {
    return sendResponse(res, false, "Validation failed", 400, { errors });
  }

  const slug = slugify(title, { lower: true, strict: true });

  // Prevent duplicates
  const existing = await client.fetch(
    `*[_type=="investment" && slug.current==$slug][0]`,
    { slug }
  );
  if (existing) {
    return sendResponse(res, false, "Investment already exists", 409);
  }

  // Upload image to Sanity safely
  let uploadedImage;
  try {
    uploadedImage = await uploadImage(imageFile, { filename: slug });
    if (!uploadedImage || !uploadedImage.asset?._ref) {
      return sendResponse(res, false, "Failed to upload image", 500);
    }
  } catch (err) {
    console.error("UPLOAD_IMAGE_ERROR:", err);
    return sendResponse(res, false, "Failed to upload image", 500);
  }

  const created = await client.create({
    _type: "investment",
    title,
    type,
    slug: { current: slug },
    image: uploadedImage, // assign the full object
    plans: [],
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return sendResponse(res, true, "Investment created successfully", 201, created);
});


// GET ALL INVESTMENTS (PAGINATED)
export const getInvestmentsController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `
    *[_type == "investment"] | order(createdAt desc) [$start...$end] {
      _id,
      title,
      createdAt,
      updatedAt,
      status
    }
  `;

  const countQuery = `count(*[_type == "investment"])`;

  const [investments, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(countQuery),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Investments fetched successfully", 200, investments, meta);
});

export const getInvestmentByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Investment ID is required", 400);
    }

    const investment = await client.fetch(
      `*[_type == "investment" && _id == $id][0]{
        _id,
        title,
        slug,
        type,
        status,
        createdAt,
        updatedAt,
        "imageUrl": image.asset->url,
        plans[]->{
          _id,
          title,
          description,
          minAmount,
          maxAmount,
          duration,
          roi,
          status
        }
      }`,
      { id }
    );

    if (!investment) {
      return sendResponse(res, false, "Investment not found", 404);
    }

    return sendResponse(res, true, "Investment fetched successfully", 200, investment);
  } catch (error) {
    console.error("GET_INVESTMENT_ERROR:", error);
    return sendResponse(res, false, "Failed to fetch investment", 500);
  }
};

// UPDATE INVESTMENT
export const updateInvestmentController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return sendResponse(res, false, "Investment ID is required", 400);

  const existing = await client.fetch(
    `*[_type=="investment" && _id==$id][0]`,
    { id }
  );
  if (!existing) return sendResponse(res, false, "Investment not found", 404);

  const { title, type: typeLabel, status: statusLabel } = req.body;
  const imageFile = req.file;

  const errors = [];

  // Validate type
  let type = existing.type;
  if (typeLabel) {
    const mappedType = typeMap[typeLabel];
    if (!mappedType) errors.push(`Invalid investment type: ${typeLabel}`);
    else type = mappedType;
  }

  // Validate status
  let status = existing.status;
  if (statusLabel) {
    const mappedStatus = statusMap[statusLabel];
    if (!mappedStatus) errors.push(`Invalid investment status: ${statusLabel}`);
    else status = mappedStatus;
  }

  const finalTitle = title?.trim() || existing.title;
  const slug = slugify(finalTitle, { lower: true, strict: true });

  if (errors.length > 0) {
    return sendResponse(res, false, "Validation failed", 400, { errors });
  }

  // Upload image if provided
  let uploadedImage = existing.image; // keep existing image by default
  if (imageFile) {
    try {
      const result = await uploadImage(imageFile, { filename: slug });
      if (!result || !result.asset?._ref) {
        return sendResponse(res, false, "Failed to upload image", 500);
      }
      uploadedImage = result; // assign full object
    } catch (err) {
      console.error("UPLOAD_IMAGE_ERROR:", err);
      return sendResponse(res, false, "Failed to upload image", 500);
    }
  }

  // Update document
  await client
    .patch(id)
    .set({
      title: finalTitle,
      type,
      slug: { current: slug },
      image: uploadedImage,
      status,
      updatedAt: new Date().toISOString(),
    })
    .commit();

  return sendResponse(res, true, "Investment updated successfully", 200);
});

// DELETE INVESTMENT
export const deleteInvestmentController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, false, "Investment ID is required", 400);
    }

    const existing = await client.fetch(
      `*[_type=="investment" && _id==$id][0]`,
      { id }
    );

    if (!existing) {
      return sendResponse(res, false, "Investment not found", 404);
    }

    await client.delete(id);

    return sendResponse(res, true, "Investment deleted successfully", 200);
  } catch (error) {
    console.error("DELETE_INVESTMENT_ERROR:", error);
    return sendResponse(res, false, "Failed to delete investment", 500);
  }
};
