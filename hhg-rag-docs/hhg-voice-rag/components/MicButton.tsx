"use client";

import React, { useState, useRef, useEffect } from "react";

interface MicButtonProps {
  onTranscript: (transcript: string, sttMs: number, traceId: string) => void;
  disabled?: boolean;
}

export function MicButton({ onTranscript, disabled }: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 15, 25, 40, 20, 15, 10]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio Level Analyzer for visual waveform feedback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const bars = Array.from(dataArray.slice(0, 7)).map(
          (val) => Math.max(10, Math.min(100, Math.round((val / 128) * 100)))
        );
        setAudioLevels(bars);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Check supported MIME types and select the cleanest available
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
        stream.getTracks().forEach((track) => track.stop());

        // Normalize clean MIME type without parameters (e.g. audio/webm instead of audio/webm;codecs=opus)
        const cleanMime = mimeType.split(";")[0].trim() || "audio/webm";
        const rawBlob = new Blob(audioChunksRef.current, { type: cleanMime });

        if (rawBlob.size > 0) {
          await handleTranscribe(rawBlob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access failed:", err);
      setErrorMessage("माइक्रोफ़ोन एक्सेस अस्वीकृत (Microphone permission denied).");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setIsTranscribing(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      // Ensure file has clean type and extension for Sarvam
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", blob, `voice_recording.${ext}`);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `STT failed (${response.status})`);
      }

      const data = await response.json();
      if (data.transcript) {
        onTranscript(data.transcript, data.sttLatencyMs || 0, data.traceId || "");
      } else {
        setErrorMessage("कोई आवाज़ नहीं पहचानी गई (No speech recognized).");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setErrorMessage((err as Error).message || "Speech transcription failed.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
      <div className="relative flex items-center justify-center">
        {/* Pulsing Aura */}
        {isRecording && (
          <div className="absolute w-24 h-24 rounded-full bg-amber-500/25 animate-ping" />
        )}

        <button
          id="mic-record-btn"
          type="button"
          onClick={toggleRecording}
          disabled={disabled || isTranscribing}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          className={`relative z-10 flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-2xl cursor-pointer select-none ${
            isRecording
              ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-black scale-105 ring-4 ring-amber-400/40 shadow-amber-500/40 animate-pulse"
              : isTranscribing
              ? "bg-gradient-to-tr from-teal-700 to-emerald-600 text-white animate-pulse"
              : "bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white hover:scale-105 hover:shadow-emerald-500/30 hover:ring-2 hover:ring-emerald-400/40 active:scale-95"
          } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          {isTranscribing ? (
            <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          ) : isRecording ? (
            <div className="w-6 h-6 bg-black rounded-sm shadow" />
          ) : (
            <svg
              className="w-8 h-8 drop-shadow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Live Waveform Indicator during recording */}
      {isRecording && (
        <div className="flex items-center justify-center gap-1 h-6">
          {audioLevels.map((lvl, i) => (
            <span
              key={i}
              className="w-1 bg-amber-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(4, lvl * 0.22)}px` }}
            />
          ))}
          <span className="ml-2 font-mono text-xs text-amber-400 font-semibold">
            00:{recordDuration < 10 ? `0${recordDuration}` : recordDuration}
          </span>
        </div>
      )}

      {/* Status Label */}
      <span className="text-xs font-mono font-medium text-[#9AA6A2] text-center tracking-wide">
        {isRecording
          ? "Recording in progress... (Click to stop)"
          : isTranscribing
          ? "Transcribing with Sarvam STT..."
          : "Tap mic to ask in Hindi or English"}
      </span>

      {/* Inline Error Toast */}
      {errorMessage && (
        <div className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs font-mono text-center animate-fade-in">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
