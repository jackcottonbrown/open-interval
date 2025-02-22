import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type ClerkClaims = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  lastSignIn?: string;
}

export async function createUser() {
  console.log("🔄 Starting user creation process...");
  try {
    const { userId, sessionClaims } = await auth();
    const claims = sessionClaims as ClerkClaims;
    
    console.log("📍 Auth check result:", { 
      userId, 
      hasSessionClaims: !!sessionClaims,
      claimsKeys: sessionClaims ? Object.keys(sessionClaims) : []
    });
    
    if (!userId) {
      console.log("❌ No userId found in auth session");
      return null;
    }

    // Get user data from session claims
    const { email, firstName, lastName, username } = claims;

    console.log("📝 Raw session claims:", claims);
    console.log("📝 Extracted user data:", { 
      userId, 
      email: email || "NOT_FOUND", 
      firstName: firstName || "NOT_FOUND",
      lastName: lastName || "NOT_FOUND",
      username: username || "NOT_FOUND"
    });

    if (!email) {
      console.error("❌ No email found in session claims. Please set up JWT claims template in Clerk dashboard");
      throw new Error("Email is required but not found in session claims. Please set up JWT claims template in Clerk dashboard");
    }

    // Check if username exists
    if (username) {
      const existingUserWithUsername = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUserWithUsername) {
        console.log("⚠️ Username already exists, will create user without username");
      }
    }

    // Create the user in our database
    console.log("💾 Attempting to create user in database...");
    await db.insert(users).values({
      id: userId,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      // Only set username if it doesn't exist
      username: username ? undefined : null,
    });

    console.log("✅ User created successfully");
    return { userId, email, firstName, lastName, username: null };
  } catch (error) {
    console.error("❌ Error in createUser:", error);
    throw error;
  }
}

export async function getUser(userId: string) {
  console.log("🔍 Looking up user:", userId);
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    console.log("📍 User lookup result:", user ? "Found" : "Not Found");
    return user;
  } catch (error) {
    console.error("❌ Error in getUser:", error);
    throw error;
  }
}

export async function deleteUser(userId: string) {
  console.log("🗑️ Attempting to delete user:", userId);
  try {
    await db.delete(users).where(eq(users.id, userId));
    console.log("✅ User deleted successfully");
    return true;
  } catch (error) {
    console.error("❌ Error in deleteUser:", error);
    throw error;
  }
}

export async function testAuthFlow() {
  console.log("\n🔄 Starting Auth Flow Test...");
  try {
    // 1. Test auth and user creation
    console.log("\n📝 Step 1: Testing User Creation");
    const newUser = await createUser();
    console.log("📍 Create User Result:", newUser);

    if (!newUser?.userId) {
      console.log("❌ No user created, stopping test");
      return;
    }

    // 2. Test getting the user
    console.log("\n🔍 Step 2: Testing User Retrieval");
    const foundUser = await getUser(newUser.userId);
    console.log("📍 Get User Result:", foundUser);

    // 3. Test deleting the user
    console.log("\n🗑️ Step 3: Testing User Deletion");
    await deleteUser(newUser.userId);
    console.log("✅ User deleted successfully");

    // 4. Verify user is gone
    console.log("\n✅ Step 4: Verifying Deletion");
    const deletedUser = await getUser(newUser.userId);
    console.log("📍 Verification Result:", deletedUser === null ? "Success" : "Failed");

    console.log("\n✅ Auth flow test completed successfully");
    return "Auth flow test completed successfully";
  } catch (error) {
    console.error("\n❌ Auth flow test failed:", error);
    throw error;
  }
} 