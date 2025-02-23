export const guidedMeditationSequence: Channel[] = [
  {
    type: 'base',
    name: 'Meditation Base',
    isEnabled: true,
    volume: 0.3,
    intervals: [
      {
        id: 'meditation-base',
        type: 'base',
        label: 'Meditation Session',
        duration: 300000, // 5 minutes
        color: '#3F51B5',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJIZ9NLvjL7zdMQaVK0mi2xnRwUOWbSqs5Cye9',
        volume: 0.3
      }
    ]
  },
  {
    type: 'tutorial',
    name: 'Meditation Guide',
    isEnabled: true,
    volume: 1,
    intervals: [
      {
        id: 'intro',
        type: 'overlay',
        label: 'Welcome and Preparation',
        startTime: 0,
        duration: 30000, // 30 seconds
        color: '#9C27B0',
        notes: 'Welcome and initial relaxation guidance. Finding comfortable position and initial breath awareness.',
        spokenLabel: '<speak><prosody rate="slow" pitch="-2st">Welcome to this guided meditation. <break time="1s"/> Find a comfortable position, either sitting or lying down, where you can remain still for the next few minutes. <break time="1s"/> Take a slow, deep breath in through your nose... <break time="2s"/> and exhale gently through your mouth. <break time="2s"/> Let your eyes close softly, or maintain a gentle gaze downward. <break time="1s"/> Allow your body to begin releasing any tension or stress you\'ve been holding. <break time="1s"/> Take another deep, nourishing breath.</prosody></speak>',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJhEENE6p1AWudzT3ZfBSG7Qp8J1Ml5kI0DVwi',
        volume: 1
      },
      {
        id: 'breathing-1',
        type: 'overlay',
        label: 'Initial Breath Focus',
        startTime: 30000, // 0:30
        duration: 45000, // 45 seconds
        color: '#E91E63',
        notes: 'Focusing attention on natural breath rhythm. Using breath as anchor for awareness.',
        spokenLabel: '<speak><prosody rate="slow" pitch="-2st">Now, bring your full attention to your breathing. <break time="1s"/> Notice the natural rhythm of your breath without trying to change it. <break time="2s"/> Feel the gentle rise and fall of your chest and belly with each breath. <break time="2s"/> As you breathe in, imagine drawing in fresh, peaceful energy. <break time="2s"/> As you breathe out, feel yourself letting go of any tension or worries. <break time="2s"/> With each inhale, your body becomes more relaxed. <break time="2s"/> With each exhale, you sink a little deeper into this moment. <break time="2s"/> If your mind begins to wander, gently guide it back to your breath, like redirecting a small child with kindness.</prosody></speak>',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJiURY5IL1SlNvJzE5stKuLMQ7xBrIejoh0Tad',
        volume: 1
      },
      {
        id: 'body-scan-1',
        type: 'overlay',
        label: 'Body Scan Start',
        startTime: 75000, // 1:15
        duration: 45000, // 45 seconds
        color: '#FF5722',
        notes: 'Beginning body scan with feet and legs. Observing sensations and releasing tension.',
        spokenLabel: '<speak><prosody rate="slow" pitch="-2st">While maintaining this gentle awareness of your breath, bring your attention to your feet and toes. <break time="2s"/> Notice any sensations present - perhaps warmth, tingling, or pressure where they meet the floor. <break time="2s"/> Without trying to change anything, simply observe these sensations with curiosity. <break time="2s"/> Gradually, let this awareness flow up through your ankles into your calves and knees. <break time="2s"/> Feel the weight of your legs releasing into the ground. <break time="2s"/> Notice any tension in your leg muscles and with each exhale, invite these muscles to soften and relax even more. <break time="2s"/> Take your time here, exploring any sensations with gentle interest.</prosody></speak>',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJWLKOdJ5P6SAIUwDKW4xNHn31JzTLFuXsZab0',
        volume: 1
      },
      {
        id: 'body-scan-2',
        type: 'overlay',
        label: 'Body Scan Middle',
        startTime: 120000, // 2:00
        duration: 45000, // 45 seconds
        color: '#FF5722',
        notes: 'Continuing body scan through back and shoulders. Releasing tension with breath awareness.',
        spokenLabel: '<speak><prosody rate="slow" pitch="-2st">Now bring your awareness to your lower back, allowing it to soften and release. <break time="2s"/> Notice how your back is supported, whether by a chair or the floor. <break time="2s"/> Let this awareness expand to include your entire back, from your tailbone up to your shoulders. <break time="2s"/> With each breath, feel your back expanding and contracting. <break time="2s"/> If you notice any areas of tension, breathe into them gently. <break time="2s"/> Imagine your breath could reach these places, bringing warmth and relaxation. <break time="2s"/> Your shoulders can release any burden they\'ve been carrying. <break time="2s"/> Feel them becoming soft and heavy, melting like snow in warm sunlight.</prosody></speak>',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJRFcB0SaNbeBxjXUWZKo7ACFmuJTf6yHwLSv3',
        volume: 1
      },
      {
        id: 'body-scan-3',
        type: 'overlay',
        label: 'Body Scan End',
        startTime: 165000, // 2:45
        duration: 45000, // 45 seconds
        color: '#FF5722',
        notes: 'Completing body scan with neck, face, and head. Establishing full-body relaxation awareness.',
        spokenLabel: '<speak><prosody rate="slow" pitch="-2st">Let your attention flow up into your neck and throat. <break time="2s"/> Notice if you\'re holding any tension here and allow it to dissolve with each breath. <break time="2s"/> Feel this wave of relaxation moving into your jaw - let it soften and release. <break time="2s"/> Your tongue can relax in your mouth, and your facial muscles can smooth out and let go. <break time="2s"/> Feel this gentle release moving through your cheeks, your forehead, even your scalp. <break time="2s"/> Your entire head can feel light and free. <break time="2s"/> Notice how your whole body is now in a state of deep relaxation, while remaining alert and aware. <break time="2s"/> Each breath continues to bring you deeper into this peaceful state.</prosody></speak>',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJkPFUEBZqpoKS1lgR4W3ejzEa5uYbdNXc8BA0',
        volume: 1
      },
      {
        id: 'mindfulness',
        type: 'overlay',
        label: 'Present Moment Awareness',
        startTime: 210000, // 3:30
        duration: 45000, // 45 seconds
        color: '#673AB7',
        notes: 'Cultivating mindful awareness. Observing thoughts without attachment.',
        spokenLabel: '<speak><prosody rate="slow" pitch="-2st">Now, rest in this space of complete awareness. <break time="2s"/> Your body is relaxed but your mind is clear and present. <break time="2s"/> Notice how thoughts may arise in your mind - perhaps about the past, or the future. <break time="2s"/> Watch them as they appear, like clouds in a vast sky. <break time="2s"/> There\'s no need to follow them or push them away. <break time="2s"/> Simply observe them passing by, always returning to the anchor of your breath. <break time="2s"/> Feel the wholeness of this moment - the sensations in your body, the rhythm of your breath, the peaceful quality of your mind. <break time="2s"/> Each moment is complete, just as it is.</prosody></speak>',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJ3GYQFzcw9TQXVKa23FoZYycRn6vLrsh7eB8k',
        volume: 1
      },
      {
        id: 'closing',
        type: 'overlay',
        label: 'Closing Guidance',
        startTime: 255000, // 4:15
        duration: 45000, // 45 seconds
        color: '#2196F3',
        notes: 'Gentle return to regular awareness. Integrating meditation experience.',
        spokenLabel: '<speak><prosody rate="slow" pitch="-2st">As we begin to draw this meditation to a close, take a few deeper breaths. <break time="2s"/> Feel the fullness of your inhale, and the complete release of your exhale. <break time="2s"/> Gradually begin to reawaken your body by making small movements in your fingers and toes. <break time="2s"/> Take a gentle stretch if that feels right. <break time="2s"/> When you\'re ready, slowly open your eyes, allowing them to readjust to the light. <break time="2s"/> Take a moment to notice how you feel - physically, mentally, and emotionally. <break time="2s"/> Carry this sense of peace and clarity with you as you return to your day. <break time="2s"/> Thank you for taking this time for yourself.</prosody></speak>',
        audioFile: 'https://hpcsoxi085.ufs.sh/f/7ebC5M2tZCOJZ0WxRZlbzfo1LRNh02V9QmnHWdxUFID4kvJC',
        volume: 1
      }
    ]
  }
];