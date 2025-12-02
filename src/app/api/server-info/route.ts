import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

export async function GET() {
  const nets = networkInterfaces();
  const results: string[] = [];

  // Проходим по всем сетевым интерфейсам (eth0, wlan0 и т.д.)
  for (const name of Object.keys(nets)) {
    const netInfo = nets[name];
    if (netInfo) {
      // Проходим по всем адресам для каждого интерфейса
      for (const net of netInfo) {
        // Выбираем только IPv4 адреса, которые не являются внутренними
        if (net.family === "IPv4" && !net.internal) {
          results.push(net.address);
        }
      }
    }
  }

  // Возвращаем JSON-ответ со списком IP-адресов
  return NextResponse.json({ localIPs: results });
}
