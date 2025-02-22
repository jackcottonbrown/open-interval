'use client';

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  TimerIcon, 
  PlusIcon, 
  PersonIcon,
  MixerHorizontalIcon,
  SunIcon,
  MoonIcon,
  PlayIcon
} from '@radix-ui/react-icons';
import { useTheme } from './ThemeProvider';

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark flex flex-col transition-colors duration-200">
      <div className="p-4 border-b border-gray-200 dark:border-dark">
        <h1 className="text-2xl font-bold text-primary dark:text-primary-400">Open Interval</h1>
      </div>

      <NavigationMenu.Root className="flex-1 p-4">
        <NavigationMenu.List className="space-y-2">
          <NavigationMenu.Item>
            <Link 
              href="/dashboard"
              className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ${
                isActive('/dashboard')
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-card text-gray-700 dark:text-dark-secondary'
              }`}
            >
              <HomeIcon />
              <span>Dashboard</span>
            </Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <Link 
              href="/my-sequences"
              className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ${
                isActive('/my-sequences')
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-card text-gray-700 dark:text-dark-secondary'
              }`}
            >
              <TimerIcon />
              <span>My Sequences</span>
            </Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <Link 
              href="/build-sequence"
              className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ${
                isActive('/build-sequence')
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-card text-gray-700 dark:text-dark-secondary'
              }`}
            >
              <PlusIcon />
              <span>Build Sequence</span>
            </Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <Link 
              href="/test-sequence"
              className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ${
                isActive('/test-sequence')
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-card text-gray-700 dark:text-dark-secondary'
              }`}
            >
              <PlayIcon />
              <span>Test Sequence</span>
            </Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <Link 
              href="/profile"
              className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ${
                isActive('/profile')
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-card text-gray-700 dark:text-dark-secondary'
              }`}
            >
              <PersonIcon />
              <span>Profile</span>
            </Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>

      <div className="p-4 border-t border-gray-200 dark:border-dark space-y-4">
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-2 p-2 w-full rounded-md hover:bg-gray-100 dark:hover:bg-dark-card text-gray-700 dark:text-dark-secondary transition-colors duration-200"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="flex items-center space-x-2 p-2">
          <UserButton 
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                rootBox: 'w-10 h-10',
                userButtonAvatarBox: 'w-10 h-10'
              }
            }}
          />
          <span className="text-gray-700 dark:text-dark-secondary">Account</span>
        </div>
      </div>
    </aside>
  );
} 