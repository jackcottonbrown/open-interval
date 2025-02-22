'use server';

import { createUser, getUser, deleteUser, testAuthFlow } from "@/lib/auth";

export type TestResult = {
  userId?: string;
  email?: string;
  success: boolean;
  message: string;
  data?: unknown;
};

export async function testCreateUser(): Promise<TestResult> {
  try {
    const result = await createUser();
    return {
      userId: result?.userId,
      email: result?.email,
      success: true,
      message: "User created successfully",
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create user"
    };
  }
}

export async function testGetUser(userId: string): Promise<TestResult> {
  try {
    const result = await getUser(userId);
    return {
      success: true,
      message: "User retrieved successfully",
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get user"
    };
  }
}

export async function testDeleteUser(userId: string): Promise<TestResult> {
  try {
    await deleteUser(userId);
    return {
      success: true,
      message: "User deleted successfully",
      userId
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete user"
    };
  }
}

export async function runTestAuthFlow(): Promise<TestResult> {
  try {
    const result = await testAuthFlow();
    return {
      success: true,
      message: "Auth flow test completed successfully",
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Auth flow test failed"
    };
  }
} 