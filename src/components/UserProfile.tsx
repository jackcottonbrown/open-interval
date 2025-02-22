import { UserButton, UserProfile as ClerkUserProfile } from "@clerk/nextjs";

export function UserProfileButton() {
  return (
    <div className="flex items-center gap-4">
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "w-10 h-10",
          },
        }}
      />
    </div>
  );
}

export function UserProfilePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ClerkUserProfile
        appearance={{
          elements: {
            rootBox: "mx-auto max-w-3xl w-full",
            card: "shadow-none",
          },
        }}
      />
    </div>
  );
} 