import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Optionally, you could import these from src/config/auth.ts to avoid duplication
// import { publicRoutes } from '@/config/auth'

// Define which routes should be public
const publicRoutePatterns = [
  '/',                   // Home page
  '/sign-in(.*)',        // Sign in pages
  '/sign-up(.*)',        // Sign up pages
  '/about(.*)',          // Public info pages
  '/api/public/(.*)',    // Public API routes
  '/sequences/public(.*)', // Public sequences
  '/profile(.*)',
  '/audio/(.*)',          // Audio files
  '/api/audio',           // Audio API endpoint (exact match)
  '/api/audio/(.*)'       // Audio API sub-routes
]

const isPublicRoute = createRouteMatcher(publicRoutePatterns)

export default clerkMiddleware(async (auth, request) => {
  // If the route is not public, protect it
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}