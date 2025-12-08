// translate.js
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY;
const AZURE_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION;
const AZURE_TRANSLATOR_ENDPOINT =
  process.env.AZURE_TRANSLATOR_ENDPOINT ||
  "https://api.cognitive.microsofttranslator.com";

const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
// ถ้าใช้ Node 18+ ที่มี fetch อยู่แล้ว สามารถลบสองบรรทัดบน แล้วใช้ fetch ตรง ๆ ได้

/**
 * แปลข้อความด้วย Google Translate v2 (API Key)
 * @param {string} text ข้อความต้นฉบับ
 * @param {string} targetLang เช่น 'en' | 'th' | 'ja'
 * @param {string} [sourceLang='auto'] เช่น 'th' | 'en' | 'ja' | 'auto'
 * @returns {Promise<{ translatedText: string, detectedSourceLanguage: string }>}
 */
export async function translateTextWithGoogle(
  text,
  targetLang,
  sourceLang = "auto",
) {
  if (!API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set");
  }
  if (!text) {
    return { translatedText: "", detectedSourceLanguage: sourceLang };
  }
  if (!targetLang) {
    throw new Error("targetLang is required");
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;

  const body = {
    q: text,
    target: targetLang,
    format: "text", // ถ้าอยากส่ง HTML ให้ใช้ 'html'
  };

  // ถ้าไม่ใช่ auto ให้ส่ง source ไปด้วย
  if (sourceLang && sourceLang !== "auto") {
    body.source = sourceLang;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Google Translate error:", data);
    throw new Error(data.error?.message || "Translate API error");
  }

  const translation = data.data.translations[0];

  return {
    translatedText: translation.translatedText,
    detectedSourceLanguage:
      translation.detectedSourceLanguage || sourceLang || "unknown",
  };
}

export async function translateTextWithAzure(
  text,
  targetLang,
  sourceLang = "auto",
) {
  if (!AZURE_TRANSLATOR_KEY) {
    throw new Error("AZURE_TRANSLATOR_KEY is not set");
  }
  if (!AZURE_TRANSLATOR_REGION) {
    throw new Error("AZURE_TRANSLATOR_REGION is not set");
  }
  if (!text) {
    return { translatedText: "", detectedSourceLanguage: sourceLang };
  }
  if (!targetLang) {
    throw new Error("targetLang is required");
  }

  const params = new URLSearchParams({
    "api-version": "3.0",
    to: targetLang,
    textType: "plain",
  });

  if (sourceLang && sourceLang !== "auto") {
    params.set("from", sourceLang);
  }

  const url = `${AZURE_TRANSLATOR_ENDPOINT}/translate?${params.toString()}`;

  const body = [
    {
      Text: text,
    },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
      "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Azure Translate error:", data);
    const message =
      data?.error?.message ||
      data?.error?.innererror?.message ||
      "Azure Translate API error";
    throw new Error(message);
  }

  // response: [ { detectedLanguage, translations: [ { text, to } ] } ]
  const first = data[0];
  const firstTranslation = first?.translations?.[0];

  return {
    translatedText: firstTranslation?.text ?? "",
    detectedSourceLanguage:
      first?.detectedLanguage?.language || sourceLang || "unknown",
  };
}
