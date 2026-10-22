import { emailTemplate } from "../../template.js";
import { sendEmail } from "../../zohoMailer.js";

export async function sendVerificationEmail({ email, name, token }) {
  const subject = "Verify Your Email - Blockvextrade";

  const appUrl = process.env.USER_APP_URL || process.env.FRONTEND_URL || "https://blockvextrade.com";
  const verificationLink = `${appUrl}/auth/verify-email?token=${token}`;

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#0b132b; margin-bottom:10px;">
        You're Almost There, ${name}!
      </h2>

      <p style="color:#444; font-size:16px; line-height:1.6;">
        Welcome to <strong>Blockvextrade</strong> — your gateway to secure and smarter investing.
        To activate your account, please verify your email. It only takes a few seconds!
      </p>

      <div style="margin:30px 0;">
        <a href="${verificationLink}"
          style="background:#1e90ff; color:#ffffff; padding:14px 32px;
                 border-radius:6px; text-decoration:none; font-weight:bold;
                 display:inline-block;">
          Verify My Email
        </a>
      </div>
      
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        By verifying, you'll join <strong>120,000+ active investors</strong> already diversifying with Blockvextrade.  
        Don't miss out on smarter opportunities.
      </p>
      
      <p style="font-size:14px; color:#666;">
        This verification link will expire in <strong>10 minutes</strong>.
      </p>

      <p style="font-size:13px; color:#888; margin-top:20px;">
        If you did not create a Blockvextrade account, you can safely ignore this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content)
  });
}

export async function sendPasswordResetEmail(email, name, otp) {
  const subject = "Your OTP Code - Blockvextrade";

  const content = `
    <p>Hi <strong>${name}</strong>,</p>

    <p>
      You recently requested to reset your password for your
      <strong>Blockvextrade</strong> account. Please use the OTP code below
      to complete the process:
    </p>

    <div style="margin:24px 0; text-align:center;">
      <span style="
        background:#0d9488;
        color:#ffffff;
        padding:10px 32px;
        font-size:20px;
        font-weight:700;
        letter-spacing:6px;
        border-radius:8px;
        display:inline-block;
      ">
        ${otp}
      </span>
    </div>

    <p>
      This OTP is valid for <strong>10 minutes</strong>.
      For your security, do not share this code with anyone.
    </p>

    <p style="font-size:13px; color:#666;">
      If you didn't request a password reset, you can safely ignore this email.
      Your account will remain secure.
    </p>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}

export async function sendPasswordChangeConfirmationEmail(email, name) {
  const subject = "Your Password Has Been Updated";

  const content = `
    <div style="padding:30px 0; text-align:center;">
      <p style="font-size:16px; color:#333; margin-bottom:16px;">
        Hi <strong>${name}</strong>,
      </p>

      <p style="font-size:15px; color:#555; line-height:1.6; margin-bottom:20px;">
        Your password has been <strong>successfully changed</strong>.
      </p>

      <p style="font-size:15px; color:#555; line-height:1.6; margin-bottom:24px;">
        If you did not perform this action, please contact our support team
        <a href="mailto:info@blockvextrade.com"
           style="color:#0b132b; font-weight:bold; text-decoration:none;">
          immediately
        </a>.
      </p>

      <p style="font-size:13px; color:#888; margin-top:20px;">
        If this was you, no further action is required.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}

export async function sendPasswordResetConfirmationEmail(email, name) {
  const subject = "Your Password Has Been Reset";

  const content = `
    <div style="padding:30px 0; text-align:center;">
      <p style="font-size:16px; color:#333; margin-bottom:16px;">
        Hi <strong>${name}</strong>,
      </p>

      <p style="font-size:15px; color:#555; line-height:1.6; margin-bottom:20px;">
        Your password has been <strong>successfully reset</strong>.
      </p>

      <p style="font-size:15px; color:#555; line-height:1.6; margin-bottom:24px;">
        If you did not perform this action, please contact our support team
        <a href="mailto:info@blockvextrade.com"
           style="color:#0b132b; font-weight:bold; text-decoration:none;">
          immediately
        </a>.
      </p>

      <p style="font-size:13px; color:#888; margin-top:20px;">
        If this was you, no further action is required.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}

export async function sendKycApprovedEmail(email, name) {
  const subject = "Your KYC Has Been Approved - Blockvextrade";

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#0b132b; margin-bottom:10px;">
        Hi ${name},
      </h2>
      
      <p style="color:#555; font-size:16px; line-height:1.6;">
        Congratulations! Your KYC submission has been <strong>approved</strong>.  
        You now have full access to all Blockvextrade features.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content)
  });
}

export async function sendKycRejectedEmail(email, name, reasons) {
  const subject = "Your KYC Has Been Rejected - Blockvextrade";

  const reasonsList = Array.isArray(reasons) 
    ? reasons.map(reason => `<li>${reason}</li>`).join("")
    : `<li>${reasons}</li>`;

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#0b132b; margin-bottom:10px;">
        Hi ${name},
      </h2>
      
      <p style="color:#555; font-size:16px; line-height:1.6;">
        Unfortunately, your KYC submission has been <strong>rejected</strong> due to the following reasons:
      </p>

      <ul style="color:#555; text-align:left; max-width:400px; margin:20px auto; line-height:1.6; padding-left:20px;">
        ${reasonsList}
      </ul>

      <p style="color:#555; font-size:16px; line-height:1.6;">
        Please correct these issues and resubmit your KYC.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content)
  });
}

export async function sendWithdrawalSuccessEmail({
  email,
  name,
  crypto,
  amount,
  walletAddress,
  date,
}) {
  const subject = "Withdrawal Successful - Blockvextrade";

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#0b132b; margin-bottom:12px;">
        Withdrawal Completed
      </h2>

      <p style="font-size:16px; color:#555; line-height:1.6;">
        Hi <strong>${name}</strong>, your withdrawal request has been
        <strong>successfully processed</strong>.
      </p>

      <table style="width:100%; border-collapse: collapse; margin:20px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Crypto</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${crypto}</td>
        </tr>
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Amount (USD)</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">$${amount}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Wallet Address</td>
          <td style="padding:10px; border:1px solid #e5e7eb; word-break:break-word;">
            ${walletAddress}
          </td>
        </tr>
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Processed On</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">
            ${new Date(date).toLocaleString()}
          </td>
        </tr>
      </table>

      <p style="font-size:14px; color:#666;">
        If you did not authorize this withdrawal, contact support immediately.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}

export async function sendWithdrawalRejectedEmail({
  email,
  name,
  crypto,
  amount,
  walletAddress,
  reason,
  date,
}) {
  const subject = "Withdrawal Rejected - Blockvextrade";

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#b91c1c; margin-bottom:12px;">
        Withdrawal Rejected
      </h2>

      <p style="font-size:16px; color:#555; line-height:1.6;">
        Hi <strong>${name}</strong>, unfortunately your withdrawal request
        could not be processed.
      </p>

      <table style="width:100%; border-collapse: collapse; margin:20px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Crypto</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${crypto}</td>
        </tr>
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Amount (USD)</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">$${amount}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Wallet Address</td>
          <td style="padding:10px; border:1px solid #e5e7eb; word-break:break-word;">
            ${walletAddress}
          </td>
        </tr>
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Reason</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">
            ${reason || "Please contact support for details"}
          </td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Reviewed On</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">
            ${new Date(date).toLocaleString()}
          </td>
        </tr>
      </table>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}

export async function sendDepositSuccessEmail({
  email,
  name,
  amount,
  method,
  reference,
  date,
}) {
  const subject = "Deposit Successful - Blockvextrade";

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#0b132b; margin-bottom:12px;">
        Deposit Completed
      </h2>

      <p style="font-size:16px; color:#555; line-height:1.6; margin-bottom: 12px;">
        Hi <strong>${name}</strong>,
      </p>
      
      <p style="font-size:16px; color:#555; line-height:1.6; margin-bottom: 12px;">
        Your deposit request of <strong>$${amount}</strong> has been successfully confirmed and automatically credited to your account.
      </p>
      
      <p style="font-size:16px; color:#555; line-height:1.6; margin-bottom: 24px;">
        Kindly log in to your account to confirm the transaction.<br>
        Thank you for choosing Blockvextrade Platform.
      </p>

      <table style="width:100%; border-collapse: collapse; margin:22px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Amount (USD)</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">$${amount}</td>
        </tr>
        ${
          method
            ? `
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Payment Method</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${method}</td>
        </tr>`
            : ""
        }
        ${
          reference
            ? `
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Reference ID</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${reference}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Processed On</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">
            ${new Date(date).toLocaleString()}
          </td>
        </tr>
      </table>

      <p style="font-size:14px; color:#666;">
        Your funds are now available for investment.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}

export async function sendDepositRejectedEmail({
  email,
  name,
  amount,
  reason,
  reference,
  date,
}) {
  const subject = "Deposit Failed - Blockvextrade";

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#b91c1c; margin-bottom:12px;">
        Deposit Failed
      </h2>

      <p style="font-size:16px; color:#555; line-height:1.6;">
        Hi <strong>${name}</strong>, unfortunately your deposit could not be processed.
      </p>

      <table style="width:100%; border-collapse: collapse; margin:22px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Amount (USD)</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">$${amount}</td>
        </tr>

        ${
          reference
            ? `
        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Reference ID</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">${reference}</td>
        </tr>`
            : ""
        }

        <tr style="background:#f9fafb;">
          <td style="padding:10px; border:1px solid #e5e7eb;">Reason</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">
            ${reason || "Deposit verification failed"}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; border:1px solid #e5e7eb;">Reviewed On</td>
          <td style="padding:10px; border:1px solid #e5e7eb;">
            ${new Date(date).toLocaleString()}
          </td>
        </tr>
      </table>

      <p style="font-size:14px; color:#666;">
        No funds were credited to your account.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}

export async function sendWelcomeEmail(email, name) {
  const subject = "Welcome to Blockvextrade Admin";

  const content = `
    <div style="text-align:center; padding:30px 0;">
      <h2 style="color:#0b132b; margin-bottom:10px;">
        Welcome to the Team, ${name}!
      </h2>
      
      <p style="color:#444; font-size:16px; line-height:1.6;">
        Your admin account has been successfully created. You now have access to the 
        <strong>Blockvextrade Management Console</strong>.
      </p>

      <div style="margin:30px 0; background: #f8fafc; padding: 20px; border-radius: 8px; display: inline-block; text-align: left;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Getting Started:</p>
        <ul style="color: #334155; font-size: 15px; margin-top: 10px; padding-left: 20px;">
          <li>Monitor user activities and investments</li>
          <li>Manage platform configurations</li>
          <li>Review and approve KYC submissions</li>
          <li>Oversee financial transactions</li>
        </ul>
      </div>

    
      
      <p style="font-size:14px; color:#666;">
        For security reasons, please ensure you never share your login credentials with anyone.
      </p>

      <p style="font-size:13px; color:#888; margin-top:20px;">
        If you have any questions regarding your administrative access, please contact the system administrator.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content)
  });
}

export async function sendAdminPasswordResetEmail(email, name, newPassword) {
  const subject = "Your Password Has Been Reset by Admin - Blockvextrade";

  const content = `
    <div style="padding:30px 0; text-align:center;">
      <p style="font-size:16px; color:#333; margin-bottom:16px;">
        Hi <strong>${name}</strong>,
      </p>

      <p style="font-size:15px; color:#555; line-height:1.6; margin-bottom:20px;">
        Your password has been reset by an administrator. Here are your new temporary login details:
      </p>
      
      <div style="margin:24px 0; text-align:center;">
        <span style="
          background:#f3f4f6;
          color:#1f2937;
          padding:10px 32px;
          font-size:18px;
          font-weight:600;
          letter-spacing:2px;
          border-radius:8px;
          border:1px solid #e5e7eb;
          display:inline-block;
        ">
          ${newPassword}
        </span>
      </div>

      <p style="font-size:15px; color:#555; line-height:1.6; margin-bottom:24px;">
        We strongly recommend that you log in and change your password immediately.
      </p>

      <p style="font-size:13px; color:#888; margin-top:20px;">
        If you did not request this, please contact support.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html: emailTemplate(content),
  });
}
