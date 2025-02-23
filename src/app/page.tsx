import Link from 'next/link';
import { Clock, Play, Users, Music, Layout, Globe } from 'lucide-react';

const features = [
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Precise Timing Control',
    description: 'Create perfectly timed sequences with millisecond precision for workouts, meditations, and more.'
  },
  {
    icon: <Play className="w-6 h-6" />,
    title: 'Audio Generation',
    description: 'Generate high-quality voice guidance using advanced text-to-speech technology.'
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Community Sharing',
    description: 'Share your sequences with the community or discover sequences created by others.'
  },
  {
    icon: <Music className="w-6 h-6" />,
    title: 'Multi-Channel Audio',
    description: 'Layer multiple audio tracks with independent timing and volume control.'
  },
  {
    icon: <Layout className="w-6 h-6" />,
    title: 'Visual Timeline',
    description: 'Intuitive visual editor for creating and managing your sequence timeline.'
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Public Library',
    description: 'Access a growing library of public sequences for various activities and purposes.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                  <span className="block">Create and Share</span>
                  <span className="block text-blue-500">Timed Audio Sequences</span>
                </h1>
                <p className="mt-3 text-base text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
                  Build perfectly timed sequences for workouts, meditations, tutorials, and more.
                  Add voice guidance, layer multiple tracks, and share with the community.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center">
                  <div className="rounded-md shadow">
                    <Link
                      href="/sequences/public"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 md:py-4 md:text-lg md:px-10"
                    >
                      Explore Sequences
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link
                      href="/sign-up"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-500 bg-gray-800 hover:bg-gray-700 md:py-4 md:text-lg md:px-10"
                    >
                      Become a Creator
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Everything you need to create perfect sequences
            </h2>
            <p className="mt-4 text-xl text-gray-300">
              Powerful features for creating, managing, and sharing timed sequences
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="pt-6"
                >
                  <div className="flow-root bg-gray-700 rounded-lg px-6 pb-8">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                          {feature.icon}
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-white tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="mt-5 text-base text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-blue-500">Join our community today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600"
              >
                Get Started
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                href="/sequences/public"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-500 bg-gray-800 hover:bg-gray-700"
              >
                Browse Sequences
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
