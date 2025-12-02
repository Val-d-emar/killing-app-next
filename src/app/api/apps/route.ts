import { NextResponse, NextRequest } from "next/server";
import fs from "fs-extra";
import path from "path";

// Директория, в которой будут создаваться файлы-флаги
const killingFolderPath = "/tmp/killing";

// Убедимся, что директория существует при первом обращении к API
fs.ensureDirSync(killingFolderPath);

/**
 * Обработчик GET-запроса: возвращает список активных приложений
 * (имена файлов из директории)
 */
export async function GET() {
  try {
    const files = await fs.readdir(killingFolderPath);
    return NextResponse.json({ activeApps: files });
  } catch (error) {
    console.error("Ошибка при чтении директории:", error);
    return NextResponse.json(
      { message: "Не удалось получить состояние" },
      { status: 500 },
    );
  }
}

/**
 * Обработчик POST-запроса: создает или удаляет файл
 */
export async function POST(request: NextRequest) {
  try {
    const {
      appName,
      action,
    }: { appName: string; action: "create" | "delete" } = await request.json();

    if (!appName) {
      return NextResponse.json(
        { message: "Имя приложения не указано" },
        { status: 400 },
      );
    }

    const filePath = path.join(killingFolderPath, appName);

    if (action === "create") {
      await fs.writeFile(filePath, "");
      return NextResponse.json({ message: `Файл ${appName} успешно создан` });
    } else if (action === "delete") {
      // Пытаемся удалить файл, игнорируя ошибку, если его и так нет
      await fs.unlink(filePath).catch((err) => {
        if (err.code !== "ENOENT") throw err;
      });
      return NextResponse.json({ message: `Файл ${appName} успешно удален` });
    } else {
      return NextResponse.json(
        { message: "Неверное действие" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Ошибка при обработке файла:", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
