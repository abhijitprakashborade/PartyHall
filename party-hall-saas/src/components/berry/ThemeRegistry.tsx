'use client';

import React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { BerryThemeProvider } from './BerryThemeProvider';

/**
 * ThemeRegistry combines MUI's AppRouterCacheProvider (for safe SSR styles)
 * with our custom BerryThemeProvider.
 */
export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <BerryThemeProvider>
        {children}
      </BerryThemeProvider>
    </AppRouterCacheProvider>
  );
}
