type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const initInstallPromptCapture = (): void => {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("pwa-install-available"));
  });
};

export const getInstallPromptEvent = (): BeforeInstallPromptEvent | null =>
  deferredPrompt;

export const onInstallPromptAvailable = (callback: () => void): (() => void) => {
  const handler = () => callback();
  window.addEventListener("pwa-install-available", handler);
  return () => window.removeEventListener("pwa-install-available", handler);
};

export const promptForInstall = async (): Promise<
  BeforeInstallPromptEvent["userChoice"] | null
> => {
  if (!deferredPrompt) {
    return null;
  }

  const promptEvent = deferredPrompt;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  deferredPrompt = null;
  return choice;
};
