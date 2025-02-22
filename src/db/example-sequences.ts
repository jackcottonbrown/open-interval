import { BaseChannel, OverlayChannel } from './schema';

// A short push-up workout with tutorial and encouragement channels
export const pushupSequence = {
  name: "Quick Push-up Challenge",
  description: "A short push-up workout with form guidance",
  isPublic: true,
  tags: ["workout", "pushups", "beginner"],
  channels: [
    // Base Channel - Defines core timeline
    {
      type: 'base' as const,
      name: "Workout",
      isEnabled: true,
      volume: 1.0,
      intervals: [
        {
          id: "prep1",
          duration: 10000, // 10 seconds
          label: "Get Ready",
          style: {
            color: "#FFA500", // Orange
            audioFile: "/audio/get-ready-a2c3cb1ea2d8.mp3"
          }
        },
        {
          id: "work1",
          duration: 30000, // 30 seconds
          label: "Push-ups",
          style: {
            color: "#FF4444", // Red
            audioFile: "/audio/pushups-f80cf8340665.mp3"
          }
        },
        {
          id: "rest1",
          duration: 20000, // 20 seconds
          label: "Rest",
          style: {
            color: "#4CAF50", // Green
            audioFile: "/audio/rest-744ad1411ed1.mp3"
          }
        },
        {
          id: "work2",
          duration: 30000, // 30 seconds
          label: "Push-ups",
          style: {
            color: "#FF4444", // Red
            audioFile: "/audio/pushups-f80cf8340665.mp3"
          }
        }
      ]
    } as BaseChannel,

    // Tutorial Channel - Form guidance with specific timing
    {
      type: 'tutorial' as const,
      name: "Form Guide",
      isEnabled: true,
      volume: 0.8,
      intervals: [
        {
          id: "tut1",
          startTime: 5000,  // 5 seconds into prep
          duration: 5000,   // 5 second tip
          label: "Get Ready",
          spokenLabel: "Get in position on your mat",
          style: { 
            color: "#2196F3",
            audioFile: "/audio/get-in-position-6w-51d933ab4114.mp3"
          }
        },
        {
          id: "tut2",
          startTime: 12000, // 2 seconds into first push-ups
          duration: 8000,   // 8 second form check
          label: "Form Check",
          spokenLabel: "Keep your core tight and back straight",
          notes: "Elbows at 45 degrees, hands shoulder-width apart",
          media: {
            imageUrl: "/images/pushup-form.jpg",
            imageAlt: "Proper push-up form showing straight back and elbow position",
            caption: "Maintain a straight line from head to heels"
          },
          style: { 
            color: "#2196F3",
            audioFile: "/audio/keep-your-core-7w-bf84dee4fa84.mp3"
          }
        },
        {
          id: "tut3",
          startTime: 62000, // 2 seconds into second push-ups
          duration: 8000,   // 8 second form reminder
          label: "Form Check",
          spokenLabel: "Focus on full range of motion",
          style: { 
            color: "#2196F3",
            audioFile: "/audio/focus-on-full-6w-10836a103772.mp3"
          }
        }
      ]
    } as OverlayChannel,

    // Encouragement Channel - Motivation at specific moments
    {
      type: 'encouragement' as const,
      name: "Motivation",
      isEnabled: true,
      volume: 0.7,
      intervals: [
        {
          id: "enc1",
          startTime: 25000, // 15 seconds into first push-ups
          duration: 5000,   // 5 second encouragement
          label: "Keep Going!",
          spokenLabel: "You're doing great, keep pushing!",
          style: { 
            color: "#9C27B0",
            audioFile: "/audio/youre-doing-great-5w-3a0543369d1c.mp3"
          }
        },
        {
          id: "enc2",
          startTime: 75000, // 15 seconds into second push-ups
          duration: 5000,   // 5 second encouragement
          label: "Final Push!",
          spokenLabel: "Last few reps, give it everything!",
          style: { 
            color: "#9C27B0",
            audioFile: "/audio/last-few-reps-6w-780df4c4fc16.mp3"
          }
        }
      ]
    } as OverlayChannel
  ]
} as const;

// Base Channel Timeline (90 seconds total):
// 0s-10s:  Prep    (10s)
// 10s-40s: Push-ups (30s)
// 40s-60s: Rest    (20s)
// 60s-90s: Push-ups (30s)

// Tutorial Triggers:
// 5s-10s:   Get ready tip
// 12s-20s:  Initial form check
// 62s-70s:  Form reminder

// Encouragement Triggers:
// 25s-30s:  First encouragement
// 75s-80s:  Final push motivation 