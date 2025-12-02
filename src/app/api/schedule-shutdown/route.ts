import { NextResponse, NextRequest } from "next/server";
import { exec } from "child_process";
import { promises as fs } from "fs";

// Файл, в котором systemd хранит информацию о запланированном выключении
const SHUTDOWN_SCHEDULE_FILE = "/run/systemd/shutdown/scheduled";

function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }
      resolve(stdout);
    });
  });
}

function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

// GET: Проверяет, есть ли запланированное выключение
export async function GET() {
  try {
    const scheduleData = await fs.readFile(SHUTDOWN_SCHEDULE_FILE, "utf-8");
    // Файл содержит время в формате microseconnds
    const [usec] = scheduleData.split("\n");
    const shutdownTime = new Date(parseInt(usec) / 1000); // ms
    return NextResponse.json({ isScheduled: true, time: shutdownTime });
  } catch (error) {
    if (isErrorWithCode(error) && error.code === "ENOENT") {
      return NextResponse.json({ isScheduled: false, time: null });
    }
    console.error("Unexpected error reading shutdown schedule:", error);
    return NextResponse.json(
      { success: false, message: "Failed to read shutdown schedule status" },
      { status: 500 },
    );
  }
}

// POST: Планирует или отменяет выключение
export async function POST(request: NextRequest) {
  try {
    const { enabled, time } = await request.json();

    if (enabled && time) {
      // 1. Сначала отменяем любое предыдущее выключение
      await runCommand("sudo /sbin/shutdown -c").catch(() => {}); // Игнорируем ошибку, если ничего не было запланировано

      // 2. Планируем новое выключение
      // Команда: sudo shutdown -h HH:MM "Сообщение"
      await runCommand(
        `sudo /sbin/shutdown -h ${time} "Shutdown scheduled at ${time}."`,
      );
      return NextResponse.json({
        success: true,
        message: `Shutdown scheduled for ${time}.`,
      });
    } else {
      // Отменяем запланированное выключение
      await runCommand("sudo /sbin/shutdown -c");
      return NextResponse.json({
        success: true,
        message: "Shutdown canceled.",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error },
      { status: 500 },
    );
  }
}
