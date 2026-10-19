import 'dotenv/config';
import bcrypt from "bcryptjs";
import { client } from "./src/lib/sanity.js";

async function seedAdmin() {
  const adminEmail = "admin@blockvextrade.com";
  const adminUsername = "Admin";
  const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || "blockvextrade.com34$";

  console.log(`Setting up exclusive admin account: ${adminEmail}...`);

  const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);
  const now = new Date().toISOString();

  // 1. Check if admin user already exists
  const existing = await client.fetch(
    `*[_type == "user" && email == $email][0]`,
    { email: adminEmail }
  );

  if (existing) {
    console.log(`Admin user found (ID: ${existing._id}). Updating password and ensuring admin role...`);
    await client
      .patch(existing._id)
      .set({
        role: "admin",
        password: hashedPassword,
        accountStatus: "active",
        emailVerified: true,
        updatedAt: now,
      })
      .commit();
    console.log(`Successfully updated admin credentials for ${adminEmail}!`);
  } else {
    console.log(`Creating new admin account...`);
    const newAdmin = await client.create({
      _type: "user",
      username: adminUsername,
      email: adminEmail,
      phoneNumber: "+10000000000",
      password: hashedPassword,
      emailVerified: true,
      accountStatus: "active",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created admin account successfully! ID: ${newAdmin._id}`);
  }

  // 2. Demote any other accounts with role == "admin"
  const otherAdmins = await client.fetch(
    `*[_type == "user" && role == "admin" && email != $email]`,
    { email: adminEmail }
  );

  if (otherAdmins && otherAdmins.length > 0) {
    console.log(`Demoting ${otherAdmins.length} other admin account(s) to 'user'...`);
    for (const other of otherAdmins) {
      await client
        .patch(other._id)
        .set({ role: "user", updatedAt: now })
        .commit();
      console.log(`Demoted ${other.email} from admin to user.`);
    }
  }

  console.log(`-----------------------------------------------`);
  console.log(`Exclusive Admin Configured:`);
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${defaultPassword}`);
  console.log(`Role:     admin`);
  console.log(`-----------------------------------------------`);
}

seedAdmin().catch((err) => {
  console.error("Error setting up admin account:", err);
  process.exit(1);
});
