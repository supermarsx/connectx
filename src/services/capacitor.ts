/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Capacitor platform integration.
 * Provides haptic feedback and status bar management for native apps.
 * Gracefully degrades to no-ops in web browser.
 */

let Capacitor: any = null;
let Haptics: any = null;
let StatusBar: any = null;
let pluginsPromise: Promise<void> | null = null;

async function loadPlugins(): Promise<void> {
  try {
    const coreMod = await import(/* @vite-ignore */ '@capacitor/core');
    Capacitor = coreMod.Capacitor;
  } catch { /* not available in browser */ }
  try {
    const hapticsMod = await import(/* @vite-ignore */ '@capacitor/haptics');
    Haptics = hapticsMod.Haptics;
  } catch { /* not available in browser */ }
  try {
    const statusBarMod = await import(/* @vite-ignore */ '@capacitor/status-bar');
    StatusBar = statusBarMod.StatusBar;
  } catch { /* not available in browser */ }
}

function ensurePlugins(): Promise<void> {
  if (!pluginsPromise) {
    pluginsPromise = loadPlugins();
  }
  return pluginsPromise;
}

export async function hapticLight() {
  await ensurePlugins();
  try { await Haptics?.impact({ style: 'LIGHT' }); } catch { /* no-op */ }
}

export async function hapticMedium() {
  await ensurePlugins();
  try { await Haptics?.impact({ style: 'MEDIUM' }); } catch { /* no-op */ }
}

export async function hapticSuccess() {
  await ensurePlugins();
  try { await Haptics?.notification({ type: 'SUCCESS' }); } catch { /* no-op */ }
}

export async function hapticError() {
  await ensurePlugins();
  try { await Haptics?.notification({ type: 'ERROR' }); } catch { /* no-op */ }
}

export async function setStatusBarLight() {
  await ensurePlugins();
  try {
    await StatusBar?.setStyle({ style: 'LIGHT' });
    await StatusBar?.setBackgroundColor({ color: '#FAF7FB' });
  } catch { /* no-op */ }
}

export async function setStatusBarDark() {
  await ensurePlugins();
  try {
    await StatusBar?.setStyle({ style: 'DARK' });
    await StatusBar?.setBackgroundColor({ color: '#1A1A2E' });
  } catch { /* no-op */ }
}

export function isNativeApp(): boolean {
  return Capacitor?.isNativePlatform?.() ?? false;
}
