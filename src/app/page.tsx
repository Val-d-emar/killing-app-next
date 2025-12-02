"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";

interface AppState {
  name: string;
  checked: boolean;
}

export default function HomePage() {
  const [apps, setApps] = useState<AppState[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const appListFromEnv = useMemo(() => {
    return (process.env.NEXT_PUBLIC_APP_LIST || "").split(",").filter(Boolean);
  }, []);

    useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setIsReadOnly(true);
      }
    }
  }, []);

  useEffect(() => {
    fetch("/api/apps")
      .then((res) => res.json())
      .then((data) => {
        const activeApps = new Set(data.activeApps || []);
        const initialAppsState = appListFromEnv.map((app) => ({
          name: app,
          checked: activeApps.has(app),
        }));
        setApps(initialAppsState);
      });
  }, [appListFromEnv]);

  const handleCheckboxChange = async (appName: string, isChecked: boolean) => {
    if (isReadOnly) {
      return;
    }

    setApps((currentApps) =>
      currentApps.map((app) =>
        app.name === appName ? { ...app, checked: isChecked } : app
      )
    );

    try {
      await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          action: isChecked ? "create" : "delete",
        }),
      });
    } catch (error) {
      console.error("Ошибка сети", error);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Block List:</h1>

        <ul className={styles.appList}>
          {apps.map((app) => (
            <li key={app.name} className={styles.appItem}>
              <input
                type="checkbox"
                id={app.name}
                name={app.name}
                checked={app.checked}
                onChange={(e) =>
                  handleCheckboxChange(app.name, e.target.checked)
                }
                className={styles.checkbox}
                disabled={isReadOnly}
              />
              <label htmlFor={app.name} className={`${styles.label} ${isReadOnly ? styles.labelDisabled : ''}`}>
                {app.name}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
