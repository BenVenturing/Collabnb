import React, { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { useAuthStore, useAuthModal } from "./store";

export const AuthModal = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, close, mode } = useAuthModal();
  const { auth } = useAuthStore();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isOpen && !auth) {
      const targetPath = mode === "signup" ? "/signup" : "/signin";

      // Only navigate if we're not already on the target page and haven't navigated yet
      if (pathname !== targetPath && !hasNavigated.current) {
        hasNavigated.current = true;
        close();
        router.push(targetPath);
      }
    }

    // Reset navigation flag when modal closes or auth changes
    if (!isOpen || auth) {
      hasNavigated.current = false;
    }
  }, [isOpen, mode, auth, close, router, pathname]);

  return null;
};

export default useAuthModal;
