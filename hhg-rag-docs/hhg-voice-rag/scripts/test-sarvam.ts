import { getEnv } from '../lib/env';

async function testSarvamSTT() {
  const env = getEnv();
  console.log("Testing Sarvam STT API with model saarika:v2.5...");

  // Generate a tiny 1-second 16kHz mono silent WAV file in memory
  const sampleRate = 16000;
  const numSamples = sampleRate * 1;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  const audioBlob = new Blob([buffer], { type: "audio/wav" });
  const formData = new FormData();
  formData.append("file", audioBlob, "test.wav");
  formData.append("model", "saarika:v2.5");

  const response = await fetch(`${env.SARVAM_API_URL || "https://api.sarvam.ai"}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": env.SARVAM_API_KEY!,
    },
    body: formData,
  });

  console.log("Status:", response.status);
  const json = await response.json();
  console.log("Response:", json);
}

testSarvamSTT().catch(console.error);
