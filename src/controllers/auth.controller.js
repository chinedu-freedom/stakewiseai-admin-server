import { client } from "../lib/sanity.js";
import { randomBytes } from "crypto";
import { addMinutes } from "date-fns";
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from "../lib/mailer.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendResponse } from "../lib/response.js";
import { hashOtp, comparePasswords, hashPassword, generateToken, verifyOtp } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(clientId);


export const register = async (req, res) => {
  try {
    const { adminSecret, fullName, email, phoneNumber, password } = req.body;

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_CODE) {
      return sendResponse(
        res,
        false,
        "Invalid or missing admin secret code",
        403
      );
    }

    if (!fullName) {
      return sendResponse(
        res,
        false,
        "Full name is required",
        400
      );
    }

    if (!email || !email.trim()) {
      return sendResponse(res, false, "Email is required", 400);
    }

    const emailNormalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailNormalized)) {
      return sendResponse(res, false, "Invalid email format", 400);
    }

    const existingUser = await client.fetch(
      `*[_type=="user" && email==$email][0]`,
      { email: emailNormalized }
    );

    if (existingUser) {
      return sendResponse(res, false, "Email is already registered", 400);
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return sendResponse(res, false, "Phone number is required", 400);
    }

    const parsedPhone = parsePhoneNumberFromString(phoneNumber);

    if (!parsedPhone || !parsedPhone.isValid()) {
      return sendResponse(res, false, "Invalid phone number format", 400);
    }

    const normalizedPhone = parsedPhone.format("E.164");

    const phoneExists = await client.fetch(
      `*[_type=="user" && phoneNumber==$phone][0]`,
      { phone: normalizedPhone }
    );

    if (phoneExists) {
      return sendResponse(
        res,
        false,
        "Phone number already registered",
        400
      );
    }

    if (!password || password.length < 8) {
      return sendResponse(
        res,
        false,
        "Password must be at least 8 characters",
        400
      );
    }

    const upperCase = /[A-Z]/.test(password);
    const lowerCase = /[a-z]/.test(password);
    const number = /[0-9]/.test(password);
    const specialChar =
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);

    if (!upperCase || !lowerCase || !number || !specialChar) {
      return sendResponse(
        res,
        false,
        "Password must contain uppercase, lowercase, number, and special character",
        400
      );
    }

    const hashedPassword = await hashPassword(password);

    const verificationToken = randomBytes(32).toString("hex");

    const hashedVerificationToken = await bcrypt.hash(
      verificationToken,
      Number(process.env.SALT_ROUNDS)
    );

    const tokenDigest = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const newAdmin = await client.create({
      _type: "user",
      fullName: fullName.trim(),
      email: emailNormalized,
      phoneNumber: normalizedPhone,
      password: hashedPassword,
      emailVerified: false,
      accountStatus: "pending",
      verificationToken: hashedVerificationToken,
      tokenDigest,
      role: "admin",
      authProvider: "email",
      tokenExpiresAt: addMinutes(new Date(), 15).toISOString(),
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    });

    try {
      await sendVerificationEmail({
        email: newAdmin.email,
        name: newAdmin.fullName.split(" ")[0],
        token: verificationToken,
      });
    } catch (emailErr) {
      console.error("Failed to send verification email", emailErr);
      return sendResponse(
        res,
        false,
        "Could not send verification email",
        500
      );
    }

    return sendResponse(
      res,
      true,
      "Verification email sent. Please check your inbox.",
      201,
      {
        userId: newAdmin._id,
        fullName: newAdmin.fullName,
        email: newAdmin.email,
        accountStatus: newAdmin.accountStatus,
        role: newAdmin.role,
      }
    );
  } catch (error) {
    console.error("Admin signup error:", error);
    return sendResponse(
      res,
      false,
      "Something went wrong while processing your request",
      500
    );
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const tokenFromQuery = req.query?.token?.trim();

    if (!tokenFromQuery) {
      return sendResponse(res, false, "Verification token is required", 400);
    }

    const digestFromQuery = crypto
      .createHash("sha256")
      .update(tokenFromQuery)
      .digest("hex");

    const query = `*[_type == "user" && role == "admin" && tokenDigest == $digest && !emailVerified][0]`;
    const admin = await client.fetch(query, { digest: digestFromQuery });

    if (!admin) {
      return sendResponse(res, false, "Invalid or expired verification token", 400);
    }

    const isValidToken = await bcrypt.compare(tokenFromQuery, admin.verificationToken);
    if (!isValidToken) {
      return sendResponse(res, false, "Invalid or expired verification token", 400);
    }

    if (admin.tokenExpiresAt && new Date() > new Date(admin.tokenExpiresAt)) {
      return sendResponse(res, false, "Verification token has expired", 400);
    }

    await client
      .patch(admin._id)
      .set({
        emailVerified: true,
        accountStatus: "active",
        verificationToken: null,
        tokenDigest: null,
        tokenExpiresAt: null,
        _updatedAt: new Date().toISOString(),
      })
      .commit();

    return sendResponse(res, true, "Email verified successfully", 200, {
      userId: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    console.error("Admin email verification error:", error);
    return sendResponse(res, false, "Something went wrong during verification", 500);
  }
};

export const resendVerification = async (req, res) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!email || !emailRegex.test(email)) {
      return sendResponse(res, false, "A valid email address is required", 400);
    }

    const user = await client.fetch(
      `*[_type == "user" && role == "admin" && lower(email) == $email][0]`,
      { email }
    );

    if (!user) {
      return sendResponse(res, false, "User not found", 404);
    }

    if (user.emailVerified) {
      return sendResponse(res, false, "Email already verified", 400);
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const newDigest = crypto.createHash("sha256").update(newToken).digest("hex");
    const hashedToken = await bcrypt.hash(newToken, Number(process.env.SALT_ROUNDS));
    const newExpiry = addMinutes(new Date(), 15).toISOString();

    await client
      .patch(user._id)
      .set({
        verificationToken: hashedToken,
        tokenDigest: newDigest,
        tokenExpiresAt: newExpiry,
      })
      .commit();

    await sendVerificationEmail({
      email: user.email,
      name: user.fullName?.split(" ")[0] || "Admin",
      token: newToken,
    });

    return sendResponse(res, true, "Verification email resent successfully", 200);
  } catch (error) {
    console.error("Error resending verification email:", error);
    return sendResponse(res, false, "Something went wrong. Please try again later.", 500);
  }
};


export const login = async (req, res) => {
  try {
    const { email, password, keepMeLoggedIn } = req.body || {};

    if (!email || typeof email !== "string") {
      return sendResponse(
        res,
        false,
        "Email is required and must be a string",
        400
      );
    }

    if (!password || typeof password !== "string") {
      return sendResponse(
        res,
        false,
        "Password is required and must be a string",
        400
      );
    }

    const emailNormalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailNormalized)) {
      return sendResponse(res, false, "Invalid email format", 400);
    }

    const user = await client.fetch(
      `*[_type == "user" && email == $email][0]{
        _id,
        fullName,
        email,
        accountStatus,
        emailVerified,
        password,
        role,
        tokenExpiresAt,
        authProvider
      }`,
      { email: emailNormalized }
    );

    const fakeHash =
      "$2b$10$invalidhashforconsistencysakexxxxxxxxxxxxxxxxxxxx";

    const passwordMatch = await comparePasswords(
      password,
      user?.password || fakeHash
    );

    if (!user || !passwordMatch) {
      return sendResponse(
        res,
        false,
        "Email or password is incorrect",
        401
      );
    }

    if (user.role !== "admin") {
      return sendResponse(
        res,
        false,
        "You are not authorized to access the admin panel",
        403
      );
    }

    if (user.accountStatus !== "active") {
      return sendResponse(
        res,
        false,
        `Your account is ${user.accountStatus}. Please verify your email or contact support.`,
        403
      );
    }

    if (!user.emailVerified) {
      const tokenExpired =
        user.tokenExpiresAt && new Date(user.tokenExpiresAt) < new Date();

      return sendResponse(
        res,
        false,
        tokenExpired
          ? "Your verification link has expired. Please request a new one."
          : "Please verify your email before logging in.",
        403
      );
    }

    const accessToken = generateToken(user._id, user.role, {
      expiresIn: keepMeLoggedIn ? "24h" : "1h",
    });

    // res.cookie("token", accessToken, {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: "lax",
    //   path: "/",
    //   maxAge: keepMeLoggedIn ? 60 * 60 * 24 * 1000 : 60 * 60 * 1000,
    //   priority: "high",
    // });


    res.cookie("token", accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: keepMeLoggedIn
    ? 1000 * 60 * 60 * 24
    : 1000 * 60 * 60,
});


    return sendResponse(res, true, "Admin login successful", 200, {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      authProvider: user.authProvider,
    });
  } catch (error) {
    console.error("Admin login error:", error);

    if (process.env.NODE_ENV === "development") {
      return sendResponse(
        res,
        false,
        "Something went wrong during login",
        500,
        { error: error.message, stack: error.stack }
      );
    }

    return sendResponse(
      res,
      false,
      "Something went wrong during login",
      500
    );
  }
};


export const logout = async (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });

    return sendResponse(res, true, "Logout successful", 200);
  } catch (error) {
    console.error("Logout error:", error);
    return sendResponse(res, false, "Logout failed", 500);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();

    if (!email) {
      return sendResponse(res, false, "Email is required", 400);
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return sendResponse(res, false, "Invalid email format", 400);
    }

    const user = await client.fetch(
      `*[_type == "user" && role == "admin" && lower(email) == $email][0]`,
      { email }
    );

    // Prevent email enumeration
    if (!user) {
      return sendResponse(
        res,
        true,
        "If the account exists, an OTP has been sent",
        200
      );
    }

    const otp = crypto.randomInt(1000, 10000).toString();
    const hashedOtp = await hashOtp(otp);
    const expiry = addMinutes(new Date(), 10);

    await client
      .patch(user._id)
      .set({
        otp: hashedOtp,
        otpExpiry: expiry,
        otpVerified: false,
      })
      .commit();

    try {
      await sendPasswordResetEmail(
        user.email,
        user.fullName?.split(" ")[0] || "dear",
        otp
      );

      console.log("OTP REQUEST RECEIVED FOR:", user.email);

      return sendResponse(res, true, "If the account exists, an OTP has been sent", 200);
    } catch (err) {
      console.error("OTP EMAIL ERROR:", err);
      return sendResponse(res, false, "Email delivery failed", 500);
    }
  } catch (err) {
    console.error("Request OTP error:", err);
    return sendResponse(
      res,
      false,
      "Server error. Please try again later.",
      500
    );
  }
};


export const verifyAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !otp) {
      return sendResponse(res, false, "Email and OTP are required.", 400);
    }

    if (!emailRegex.test(email)) {
      return sendResponse(res, false, "Please provide a valid email address.", 400);
    }

    const normalizedEmail = email.toLowerCase();

    const user = await client.fetch(
      `*[_type == "user" && role == "admin" && lower(email) == $email][0]`,
      { email: normalizedEmail }
    );

    if (!user) {
      return sendResponse(res, false, "Invalid OTP or email.", 400);
    }

    const isOtpValid = await verifyOtp(otp, user.otp);

    if (!isOtpValid || !user.otpExpiry || new Date(user.otpExpiry) < new Date()) {
      return sendResponse(res, false, "Invalid or expired OTP.", 400);
    }

    await client.patch(user._id).set({ otpVerified: true }).commit();

    return sendResponse(res, true, "OTP verified successfully.", 200);
  } catch (err) {
    console.error("OTP verification error:", err);
    return sendResponse(
      res,
      false,
      "An unexpected server error occurred. Please try again later.",
      500
    );
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return sendResponse(res, false, "Email and new password are required.", 400);
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return sendResponse(res, false, "Invalid email format.", 400);
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return sendResponse(
        res,
        false,
        "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
        400
      );
    }

    const normalizedEmail = email.toLowerCase();

    const user = await client.fetch(
      `*[_type == "user" && role == "admin" && lower(email) == $email][0]`,
      { email: normalizedEmail }
    );

    if (!user || !user.otpVerified) {
      return sendResponse(res, false, "Invalid email or OTP not verified.", 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    await client
      .patch(user._id)
      .set({
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
        otpVerified: false,
      })
      .commit();

    await sendPasswordResetConfirmationEmail(
      user.email,
      user.fullName?.split(" ")[0] || "Admin"
    );

    return sendResponse(res, true, "Password reset successful.", 200);
  } catch (error) {
    console.error("Reset password error:", error);
    return sendResponse(
      res,
      false,
      "An unexpected server error occurred. Please try again later.",
      500
    );
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendResponse(res, false, "Google ID token is required", 400);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return sendResponse(res, false, "Invalid Google token payload", 400);
    }

    const { email, name } = payload;

    let user = await client.fetch(
      `*[_type=="user" && role=="admin" && email==$email][0]`,
      { email }
    );

    if (!user) {
      user = await client.create({
        _type: "user",
        role: "admin",
        email,
        fullName: name,
        emailVerified: true,
        authProvider: "google",
        accountStatus: "incomplete",
        _createdAt: new Date().toISOString(),
      });
    }

    const accessToken = generateToken(user._id, user.role, { expiresIn: "1h" });

    // Set cookie
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
    });

    return sendResponse(res, true, "Google sign-in successful", 200, {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      accountStatus: user.accountStatus,
      authProvider: user.authProvider,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });
  } catch (error) {
    console.error("Google sign-in error:", error);
    return sendResponse(res, false, "Authentication failed", 400);
  }
};
