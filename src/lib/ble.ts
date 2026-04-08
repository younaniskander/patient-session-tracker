const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const TX_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const RX_UUID = "beb5483f-36e1-4688-b7f5-ea07361b26a8";

export interface BLEData {
  f1: number;
  f2: number;
  s: number;
}

let bleDevice: BluetoothDevice | null = null;
let rxChar: BluetoothRemoteGATTCharacteristic | null = null;

export async function connectBLE(
  onData: (data: BLEData) => void,
  onDisconnect: () => void
): Promise<void> {
  bleDevice = await navigator.bluetooth.requestDevice({
    filters: [{ name: "ESP32_Flex_BLE" }],
    optionalServices: [SERVICE_UUID],
  });
  const server = await bleDevice!.gatt!.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  rxChar = await service.getCharacteristic(RX_UUID);
  const tx = await service.getCharacteristic(TX_UUID);
  await tx.startNotifications();

  tx.addEventListener("characteristicvaluechanged", (e: Event) => {
    const target = e.target as BluetoothRemoteGATTCharacteristic;
    const data: BLEData = JSON.parse(new TextDecoder().decode(target.value!));
    onData(data);
  });

  bleDevice!.addEventListener("gattserverdisconnected", onDisconnect);
}

export function disconnectBLE() {
  bleDevice?.gatt?.disconnect();
}

export async function sendCommand(cmd: string) {
  if (!rxChar) return;
  await rxChar.writeValue(new TextEncoder().encode(cmd));
}

// Audio beep
let audioCtx: AudioContext | null = null;
export function beep() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}
