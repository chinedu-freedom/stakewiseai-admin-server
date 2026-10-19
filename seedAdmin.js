import 'dotenv/config';
import bcrypt from "bcryptjs";
import { client } from "./src/lib/sanity.js";

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@blockvextrade.com";
  const adminUsername = "Admin";
  const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || "Admin@123456";

  console.log(`Checking for existing admin user with email: ${adminEmail}...`);

  const existing = await client.fetch(
    `*[_type == "user" && email == $email][0]`,
    { email: adminEmail.toLowerCase().trim() }
  );

  if (existing) {
    if (existing.role === "admin") {
      console.log(`Admin account already exists: ${existing.email} (ID: ${existing._id})`);
      return;
    }

    console.log(`User exists with role '${existing.role}'. Upgrading to 'admin'...`);
    await client
      .patch(existing._id)
      .set({
        role: "admin",
        accountStatus: "active",
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      })
      .commit();
    console.log(`Successfully upgraded ${existing.email} to admin!`);
    return;
  }

  console.log(`Creating new admin user...`);
  const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);
  const now = new Date().toISOString();

  const newAdmin = await client.create({
    _type: "user",
    username: adminUsername,
    email: adminEmail.toLowerCase().trim(),
    phoneNumber: "+2348000000000",
    password: hashedPassword,
    emailVerified: true,
    accountStatus: "active",
    role: "admin",
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Admin account created successfully!`);
  console.log(`Email:    ${newAdmin.email}`);
  console.log(`Password: ${defaultPassword}`);
  console.log(`ID:       ${newAdmin._id}`);
}

seedAdmin().catch((err) => {
  console.error("Error seeding admin:", err);
  process.exit(1);
});
