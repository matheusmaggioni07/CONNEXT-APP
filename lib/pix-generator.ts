"use server"

import qrcode from "qrcode"

/**
 * Gera um QR Code PIX baseado na chave PIX fornecida
 * Usa o padrão EMV (ABNT NBR ISO/IEC 20022) para PIX
 */

interface PIXQRCodeResult {
  qrCode: string // URL da imagem do QR code em base64
  copyPasteKey: string // Chave para copiar e colar (EMV string)
  expiresAt: Date
}

export async function generatePIXQRCode(
  pixKey: string,
  amount: number, // em centavos (ex: 4990 para R$49.90)
  merchantName = "Connext",
  merchantCity = "Sao Paulo",
  transactionId?: string,
): Promise<PIXQRCodeResult> {
  try {
    // Gera ID de transação único se não fornecido
    const txId = transactionId || generateTransactionId()

    // Constrói a string EMV do PIX
    const emvString = buildEMVString(pixKey, amount, merchantName, merchantCity, txId)

    // Calcula CRC16 e adiciona ao final
    const crc = calculateCRC16(emvString + "6304")
    const emvWithCRC = emvString + "6304" + crc

    // Gera QR code como data URL
    const qrCodeDataUrl = await qrcode.toDataURL(emvWithCRC, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    // Define expiração em 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    return {
      qrCode: qrCodeDataUrl,
      copyPasteKey: emvWithCRC,
      expiresAt,
    }
  } catch (error) {
    console.error("[PIX] Erro ao gerar QR code:", error)
    throw new Error("Falha ao gerar QR code PIX")
  }
}

/**
 * Gera um ID de transação único
 */
function generateTransactionId(): string {
  return Math.random().toString(36).substring(2, 15).toUpperCase().padEnd(14, "0").substring(0, 14)
}

/**
 * Constrói a string EMV completa para PIX
 */
function buildEMVString(
  pixKey: string,
  amount: number,
  merchantName: string,
  merchantCity: string,
  transactionId: string,
): string {
  let emv = ""

  // Formato do indicador de carga útil: "00" + "02" + "01"
  emv += "000201"

  // Dados do PIX: "26" + comprimento + dados
  const pixData = buildPIXData(pixKey, transactionId)
  emv += "26" + pad(pixData.length, 2) + pixData

  // Categoria de estabelecimento comercial: "52" + "04" + "0000"
  emv += "520400000"

  // Código da moeda: "53" + "03" + "986" (986 = BRL)
  emv += "5303986"

  // Valor (opcional, pode ser vazio para QR dinâmico)
  if (amount > 0) {
    const amountStr = (amount / 100).toFixed(2).replace(".", "")
    emv += "54" + pad(amountStr.length, 2) + amountStr
  }

  // País: "58" + "02" + "BR"
  emv += "5802BR"

  // Nome do beneficiário: "59" + comprimento + nome
  const nameData = sanitizeString(merchantName).substring(0, 25) // Máximo 25 caracteres
  emv += "59" + pad(nameData.length, 2) + nameData

  // Cidade: "60" + comprimento + cidade
  const cityData = sanitizeString(merchantCity).substring(0, 25) // Máximo 25 caracteres
  emv += "60" + pad(cityData.length, 2) + cityData

  // Dados adicionais do beneficiário: "62" + comprimento + dados
  const additionalData = "0511" + pad(transactionId.length, 2) + transactionId
  emv += "62" + pad(additionalData.length, 2) + additionalData

  return emv
}

/**
 * Constrói os dados do PIX (GUI + chave + ID de transação)
 */
function buildPIXData(pixKey: string, transactionId: string): string {
  let data = ""

  // GUI: "00" + "11" + "br.gov.bcb.pix"
  data += "0011" + "br.gov.bcb.pix"

  // Chave PIX: "01" + comprimento + chave
  const keyData = sanitizeString(pixKey)
  data += "01" + pad(keyData.length, 2) + keyData

  // ID de transação: "02" + comprimento + ID
  const txIdData = transactionId.substring(0, 25)
  data += "02" + pad(txIdData.length, 2) + txIdData

  return data
}

/**
 * Sanitiza strings para ASCII
 */
function sanitizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9@\-._]/g, "") // Apenas caracteres permitidos
    .substring(0, 25)
}

/**
 * Padding de números com zeros à esquerda
 */
function pad(value: number | string, length: number): string {
  return String(value).padStart(length, "0")
}

/**
 * Calcula CRC16-CCITT (polinômio 0x1021, initial value 0xFFFF)
 * Conforme especificação de QR code dinâmico do PIX
 */
function calculateCRC16(data: string): string {
  let crc = 0xffff
  const polynomial = 0x1021

  for (let i = 0; i < data.length; i += 2) {
    const byte = Number.parseInt(data.substr(i, 2), 16)
    crc ^= byte << 8

    for (let j = 0; j < 8; j++) {
      const shift = crc & 0x8000
      crc = (crc << 1) & 0xffff

      if (shift) {
        crc ^= polynomial
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0")
}
