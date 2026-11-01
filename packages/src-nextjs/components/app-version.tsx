"use client";

import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function AppVersion() {
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    if (!isTauri()) return;

    let active = true;
    getVersion().then(
      (value) => {
        if (active) setVersion(value);
      },
      (error: unknown) => {
        console.error("Could not read the application version:", error);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return <span>Locus{version ? ` · ${version}` : ""}</span>;
}
