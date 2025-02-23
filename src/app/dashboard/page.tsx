import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { createUser, getUser } from "@/lib/auth";

export default async function DashboardPage() {
  console.log("🔄 Dashboard: Starting page load");
  const { userId } = await auth();
  console.log("📍 Dashboard: Auth check result:", { userId });

  if (!userId) {
    console.log("❌ Dashboard: No userId found, redirecting to sign in");
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  // Check if user exists in our database
  console.log("🔍 Dashboard: Checking if user exists in database");
  const existingUser = await getUser(userId);
  console.log("📍 Dashboard: User exists:", !!existingUser);
  
  // If user doesn't exist, try to create them
  if (!existingUser) {
    console.log("📝 Dashboard: User not found, attempting to create");
    try {
      const result = await createUser();
      console.log("📍 Dashboard: User creation result:", !!result);
      if (!result) {
        console.log("❌ Dashboard: User creation failed");
        return (
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Account Setup Required</h1>
              <p className="text-gray-600 mb-4">
                Please sign out and sign back in to complete your account setup.
              </p>
            </div>
          </div>
        );
      }
    } catch (error) {
      console.error("❌ Dashboard: Error creating user:", error);
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Setup Error</h1>
            <p className="text-gray-600 mb-4">
              There was an error setting up your account. Please try signing out and back in.
            </p>
          </div>
        </div>
      );
    }
  }

  console.log("✅ Dashboard: Rendering dashboard for user:", userId);
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          href="/my-sequences"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">My Sequences</h2>
          <p className="text-gray-600">View and manage your created sequences</p>
        </Link>

        <Link 
          href="/build-sequence"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Build Sequence</h2>
          <p className="text-gray-600">Create a new sequence</p>
        </Link>
      </div>
    </div>
  );
} 