// Типы для той части `qrcode`, которой пользуется сцена рамки (StageQr): своих типов у пакета нет.
declare module "qrcode" {
  export type QRCodeToStringOptions = {
    type?: "svg" | "utf8" | "terminal";
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    color?: { dark?: string; light?: string };
  };
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
}
