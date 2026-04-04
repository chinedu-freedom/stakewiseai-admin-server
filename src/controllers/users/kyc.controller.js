import { client } from "../../lib/sanity.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendResponse } from "../../lib/response.js";
import { getPaginationParams, buildPaginationMeta } from "../../lib/pagination.js";

export const getKycController = asyncHandler(async (req, res) => {
  const { page, limit, start, end } = getPaginationParams(req);

  const query = `
    *[_type == "kyc"]
    | order(_createdAt desc)
    [$start...$end]{
      _id,
      userName,
      email,
      address,
      maritalStatus,
      dob,
      idType,
      "idFront": idFront.asset->url,
      "idBack": idBack.asset->url,
      status,
      _createdAt,
      _updatedAt,
      "user": user->{
        _id,
        userName,
        email,
        phoneNumber,
        role,
        _createdAt,
        _updatedAt
      }
    }
  `;

  const [kycRecords, total] = await Promise.all([
    client.fetch(query, { start, end }),
    client.fetch(`count(*[_type == "kyc"])`),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return sendResponse(res, true, "Fetched KYC applications", 200, {
    records: kycRecords,
    pagination,
  });
});



// GET — Fetch single KYC by ID
export const getKycByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendResponse(res, false, "KYC ID is required", 400);
  }

  try {
    const kyc = await client.fetch(
      `*[_type == "kyc" && _id == $id][0]{
        _id,
        userName,
        email,
        address,
        maritalStatus,
        dob,
        idType,
        "idFront": idFront.asset->url,
        "idBack": idBack.asset->url,
        rejectionReasons,
        status,
        _createdAt,
        _updatedAt,
        "user": user->{
          _id,
          userName,
          email,
          phoneNumber,
          role,
          _createdAt,
          _updatedAt
        }
      }`,
      { id }
    );

    if (!kyc) {
      return sendResponse(res, false, "KYC record not found", 404);
    }

    return sendResponse(res, true, "KYC record fetched successfully", 200, kyc);
  } catch (err) {
    console.error("KYC GET error:", err);
    return sendResponse(res, false, "Server error fetching KYC record", 500);
  }
});

// PATCH — Approve or Reject KYC
export const updateKycStatusController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reasons } = req.body;

  if (!id) return sendResponse(res, false, "KYC ID is required", 400);
  if (!["approve", "reject"].includes(action)) {
    return sendResponse(res, false, "Invalid action. Allowed: approve or reject", 400);
  }

  try {
    const existingKyc = await client.fetch(
      `*[_type == "kyc" && _id == $id][0]{ status }`,
      { id }
    );

    if (!existingKyc) return sendResponse(res, false, "KYC record not found", 404);

    // Prevent reversing status
    if (existingKyc.status === "approved" && action === "reject") {
      return sendResponse(res, false, "Approved KYC cannot be rejected", 400);
    }
    if (existingKyc.status === "rejected" && action === "approve") {
      return sendResponse(res, false, "Rejected KYC cannot be approved", 400);
    }

    // Require reasons for rejection
    if (action === "reject" && (!Array.isArray(reasons) || reasons.length === 0)) {
      return sendResponse(res, false, "At least one rejection reason is required for rejection", 400);
    }

    const updateData =
      action === "approve"
        ? { status: "approved", rejectionReasons: [] }
        : { status: "rejected", rejectionReasons: reasons };

    const updated = await client.patch(id).set(updateData).commit();

    return sendResponse(res, true, `KYC ${updateData.status} successfully`, 200, updated);
  } catch (err) {
    console.error("KYC PATCH error:", err);
    return sendResponse(res, false, "Server error updating KYC status", 500);
  }
});

// DELETE — Delete KYC record by ID
export const deleteKycController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) return sendResponse(res, false, "KYC ID is required", 400);

  try {
    const existing = await client.fetch(
      `*[_type == "kyc" && _id == $id][0]{ _id }`,
      { id }
    );

    if (!existing) return sendResponse(res, false, "KYC record not found", 404);

    await client.delete(id);

    return sendResponse(res, true, "KYC record deleted successfully", 200);
  } catch (err) {
    console.error("KYC DELETE error:", err);
    return sendResponse(res, false, "Server error deleting KYC record", 500);
  }
});
