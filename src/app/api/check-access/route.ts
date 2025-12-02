import { NextResponse, NextRequest } from "next/server";
import { networkInterfaces } from "os";

export async function GET(request: NextRequest) {
  // 1. Получаем IP клиента из заголовков
  const forwardedFor = request.headers.get("x-forwarded-for");
  // Если заголовка нет (прямое соединение), считаем, что это localhost.
  // Иначе берем первый IP из списка.
  const clientIp = forwardedFor
    ? forwardedFor.split(",")[0].trim().replace("::ffff:", "")
    : "127.0.0.1";

  // 2. Получаем список IP-адресов самого сервера
  const serverIps: string[] = ["127.0.0.1", "::1"]; // Сразу добавляем адреса loopback
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netInfo = nets[name];
    if (netInfo) {
      for (const net of netInfo) {
        if (net.family === "IPv4" && !net.internal) {
          serverIps.push(net.address);
        }
      }
    }
  }

  // 3. Сравниваем IP клиента со списком IP сервера
  const isLocal = serverIps.includes(clientIp);
  console.log("clientIp=", clientIp);
  console.log("serverIps=", serverIps);

  // 4. Возвращаем результат
  return NextResponse.json({ isLocalAccess: isLocal });
}
