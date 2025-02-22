'use client';

import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <UserProfile 
        appearance={{
          elements: {
            rootBox: 'mx-auto max-w-3xl',
            card: 'bg-white dark:bg-dark-card shadow-none',
          }
        }}
      />
    </div>
  );
} 