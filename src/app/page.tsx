"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";

interface AppState {
  name: string;
  checked: boolean;
}

interface DeadlineState {
  isScheduled: boolean;
  time: string; // В формате HH:mm
}

export default function HomePage() {
  const [apps, setApps] = useState<AppState[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [deadline, setDeadline] = useState<DeadlineState>({
    isScheduled: false,
    time: "22:00",
  });

  const appListFromEnv = useMemo(() => {
    return (process.env.NEXT_PUBLIC_APP_LIST || "").split(",").filter(Boolean);
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch("/api/check-access");
        const data = await response.json();

        setIsReadOnly(data.isLocalAccess);
      } catch (error) {
        console.error(
          "Access check failed, granting write access by default:",
          error,
        );
        setIsReadOnly(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, []);

  useEffect(() => {
    if (isLoading) return;
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
    fetch("/api/schedule-shutdown")
      .then((res) => res.json())
      .then((data) => {
        if (data.isScheduled && data.time) {
          const date = new Date(data.time);
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          setDeadline({ isScheduled: true, time: `${hours}:${minutes}` });
        }
      });
  }, [appListFromEnv, isLoading]);

  const handleCheckboxChange = async (appName: string, isChecked: boolean) => {
    if (isReadOnly) {
      return;
    }

    setApps((currentApps) =>
      currentApps.map((app) =>
        app.name === appName ? { ...app, checked: isChecked } : app,
      ),
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

  const handleDeadlineChange = async (
    newEnabledState: boolean,
    newTime: string,
  ) => {
    if (isReadOnly) return;
    setDeadline({ isScheduled: newEnabledState, time: newTime });
    await fetch("/api/schedule-shutdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newEnabledState, time: newTime }),
    });
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {isLoading && (
          <div className={styles.readOnlyNotice}>Access is checking...</div>
        )}
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
              <label
                htmlFor={app.name}
                className={`${styles.label} ${isReadOnly ? styles.labelDisabled : ""}`}
              >
                {app.name}
              </label>
            </li>
          ))}
          <li className={`${styles.appItem} ${styles.deadlineItem}`}>
            <input
              type="checkbox"
              id="deadline"
              name="deadline"
              checked={deadline.isScheduled}
              onChange={(e) =>
                handleDeadlineChange(e.target.checked, deadline.time)
              }
              className={styles.checkbox}
              disabled={isReadOnly}
            />
            <label
              htmlFor="deadline"
              className={`${styles.label} ${isReadOnly ? styles.labelDisabled : ""}`}
            >
              Deadline
            </label>
            <input
              type="time"
              value={deadline.time}
              onChange={(e) =>
                handleDeadlineChange(deadline.isScheduled, e.target.value)
              }
              className={styles.timeInput}
              disabled={isReadOnly || !deadline.isScheduled}
            />
          </li>
        </ul>
      </div>
    </main>
  );
}
