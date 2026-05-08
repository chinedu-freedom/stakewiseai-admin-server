import { comparePasswords, hashPassword } from "../lib/auth.js";
import { sendPasswordChangeConfirmationEmail } from "../lib/mailer.js";
import { sendResponse } from "../lib/response.js";
import { uploadImage } from "../lib/uploadImage.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { client } from "../lib/sanity.js";
import { getPaginationParams, buildPaginationMeta } from "../lib/pagination.js";

export const changePasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendResponse(res, false, "Both current and new passwords are required", 400);
    }

    const dbUser = await client.fetch(
      `*[_type == "user" && role == "admin" && _id == $userId][0]`,
      { userId: req.user.userId }
    );

    if (!dbUser) {
      return sendResponse(res, false, "Unauthorized action", 401);
    }

    const isValid = await comparePasswords(currentPassword, dbUser.password);
    if (!isValid) {
      return sendResponse(res, false, "Incorrect current password", 401);
    }

    const isTheSame = await comparePasswords(newPassword, dbUser.password);
    if (isTheSame) {
      return sendResponse(
        res,
        false,
        "New password must be different from the old password",
        400
      );
    }

    const upperCase = /[A-Z]/.test(newPassword);
    const lowerCase = /[a-z]/.test(newPassword);
    const number = /[0-9]/.test(newPassword);
    const specialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword);

    if (!upperCase || !lowerCase || !number || !specialChar || newPassword.length < 8) {
      return sendResponse(
        res,
        false,
        "New password must be at least 8 characters and contain uppercase, lowercase, number, and special character",
        400
      );
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await client
      .patch(dbUser._id)
      .set({ password: hashedNewPassword, updatedAt: new Date().toISOString() })
      .commit();

    await sendPasswordChangeConfirmationEmail(
      dbUser.email,
      dbUser.username?.split(" ")[0] || "Admin"
    );

    return sendResponse(res, true, "Password updated successfully", 200);
  } catch (error) {
    console.error("Password change error:", error);
    return sendResponse(
      res,
      false,
      "Something went wrong while changing your password",
      500
    );
  }
};

export const updateUserProfileController = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user?.userId) {
    return sendResponse(res, false, "Unauthorized: Please log in", 401);
  }

  const { dateOfBirth, postalCode, city } = req.body;
  const imageFile = req.file; // multer middleware should populate req.file

  const errors = [];

  // Validate dateOfBirth
  if (dateOfBirth) {
    const date = new Date(dateOfBirth);
    if (isNaN(date.getTime())) {
      errors.push("dateOfBirth: Invalid date of birth");
    } else if (date > new Date()) {
      errors.push("Date of birth cannot be in the future");
    }
  }

  // Validate postalCode
  if (postalCode) {
    if (!/^[A-Za-z0-9\s-]{3,20}$/.test(postalCode)) {
      errors.push(
        "Postal code must be 3–20 characters (letters, numbers, spaces, or hyphens)"
      );
    }
  }

  // Validate city
  if (city) {
    if (city.length > 100) errors.push("city: Must be at most 100 characters");
    if (!/^[A-Za-z\s'-]+$/.test(city)) {
      errors.push(
        "City must contain only letters, spaces, apostrophes, or hyphens"
      );
    }
  }

  // Validate image
  if (imageFile && !(imageFile.buffer && imageFile.buffer.length > 0)) {
    errors.push("image: Invalid image file");
  }

  if (errors.length > 0) {
    return sendResponse(res, false, "Validation failed", 400, { errors });
  }

  const updatedAta = {};
  if (dateOfBirth) updatedAta.dateOfBirth = new Date(dateOfBirth).toISOString();
  if (postalCode) updatedAta.postalCode = postalCode;
  if (city) updatedAta.city = city;

  // Upload image to Sanity and get the proper _ref
  if (imageFile) {
    const uploadedImage = await uploadImage(imageFile, { filename: `profile-${user.userId}` });
    if (!uploadedImage || !uploadedImage.asset?._ref) {
      return sendResponse(res, false, "Failed to upload image", 500);
    }
    updatedAta.image = uploadedImage; // directly assign the object
  }

  if (Object.keys(updatedAta).length === 0) {
    return sendResponse(res, false, "No valid fields provided", 400);
  }

  const updatedUser = await client
    .patch(user.userId)
    .set(updatedAta)
    .commit({ autoGenerateArrayKeys: true });

  const safeData = {
    email: updatedUser.email,
    username: updatedUser.username,
    dateOfBirth: updatedUser.dateOfBirth,
    postalCode: updatedUser.postalCode,
    city: updatedUser.city,
    image: updatedUser.image,
    role: updatedUser.role,
  };

  return sendResponse(res, true, "Profile updated successfully", 200, safeData);
});


// Admin Get Profile
export const getUserProfileController = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user?.userId) {
    return sendResponse(res, false, "Unauthorized: Please log in", 401);
  }

  const query = `*[_type == "user" && role == "admin" && _id == $id][0]{
    email,
    username,
    dateOfBirth,
    postalCode,
    city,
    role,
    image
  }`;

  const profile = await client.fetch(query, { id: user.userId });

  if (!profile) {
    return sendResponse(res, false, "Profile not found", 404);
  }

  return sendResponse(res, true, "Profile retrieved successfully", 200, profile);
});

export const getDashboardStatsController = async (req, res) => {
  try {
    const { page, limit, start, end } = getPaginationParams(req, 5);

    const [totalUsers, investments, deposits, withdrawals] = await Promise.all([
      client.fetch(
        `count(*[_type == "user" && role == "user" && accountStatus == "active"])`
      ),
      client.fetch(
        `*[_type == "userInvestment" && user->accountStatus == "active"]{amount}`
      ),
      client.fetch(
        `*[_type == "deposit" && status == "successful" && user->accountStatus == "active"]{amount}`
      ),
      client.fetch(
        `*[_type == "withdrawal" && status == "successful" && user->accountStatus == "active"]{amount}`
      ),
    ]);

    const totalInvestmentAmount = investments.reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0
    );
    const totalDepositAmount = deposits.reduce(
      (sum, d) => sum + Number(d.amount || 0),
      0
    );
    const totalWithdrawalAmount = withdrawals.reduce(
      (sum, w) => sum + Number(w.amount || 0),
      0
    );

    const totalActivities = await client.fetch(`count(*[_type == "userActivity"])`);

    const activitiesQuery = `*[_type == "userActivity"] | order(timestamp desc) [${start}...${end}] {
      _id,
      action,
      details,
      status,
      timestamp,
      "user": user->{
        _id,
        username,
        email
      }
    }`;

    const activities = await client.fetch(activitiesQuery);

    return sendResponse(res, true, "Fetched admin stats successfully", 200, {
      totals: {
        users: totalUsers,
        investments: totalInvestmentAmount,
        deposits: totalDepositAmount,
        withdrawals: totalWithdrawalAmount,
      },
      activities,
      meta: buildPaginationMeta(totalActivities, page, limit),
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return sendResponse(res, false, "Server error fetching admin stats", 500);
  }
};

export const getReferralConfigController = asyncHandler(async (req, res) => {
  const query = `*[_type == "referralConfig"][0]`;
  let config = await client.fetch(query);

  if (!config) {
    // Return default values if not set yet
    config = {
      level1: 10,
      level2: 5,
      level3: 1,
    };
  }

  return sendResponse(res, true, "Referral configuration fetched successfully", 200, config);
});

export const updateReferralConfigController = asyncHandler(async (req, res) => {
  const { level1, level2, level3 } = req.body;

  if (level1 === undefined || level2 === undefined || level3 === undefined) {
    return sendResponse(res, false, "All levels are required", 400);
  }

  // Find or create the singleton config document
  const existingConfig = await client.fetch(`*[_type == "referralConfig"][0]`);
  
  const configData = {
    _type: "referralConfig",
    level1: Number(level1),
    level2: Number(level2),
    level3: Number(level3),
    updatedAt: new Date().toISOString(),
  };

  if (existingConfig) {
    await client.patch(existingConfig._id).set(configData).commit();
  } else {
    await client.create(configData);
  }

  return sendResponse(res, true, "Referral configuration updated successfully", 200, configData);
});

