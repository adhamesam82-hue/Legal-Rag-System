"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { configureAuthToken } from "@/lib/api";

/** Bridges Clerk's getToken() into the plain api.ts client, so every api.*
 *  call attaches the current session's bearer token with no per-call-site
 *  wiring. Renders nothing. */
export function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    configureAuthToken(getToken);
  }, [getToken]);

  return null;
}
