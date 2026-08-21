"use client";

import React, { useState, useRef, useEffect } from "react";

interface MicButtonProps {
  onTranscript: (transcript: string, sttMs: number, traceId: string) => void;
  disabled?: boolean;
}

export function MicButton({ onTranscript, disabled }: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio Level Analyzer for visual waveform feedback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Check supported MIME types
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = "";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (audioBlob.size > 0) {
          await handleTranscribe(audioBlob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Microphone access was denied or is unavailable.");
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
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`STT failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.transcript) {
        onTranscript(data.transcript, data.sttLatencyMs || 0, data.traceId || "");
      }
    } catch (err) {
      console.error("Transcription failed:", err);
      alert("Audio transcription failed. Please try typing your query.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* Pulsing Aura */}
        {isRecording && (
          <div
            className="absolute rounded-full bg-amber-500/20 animate-ping"
            style={{
              width: `${70 + audioLevel * 0.8}px`,
              height: `${70 + audioLevel * 0.8}px`,
            }}
          />
        )}

        <button
          id="mic-record-btn"
          type="button"
          onClick={toggleRecording}
          disabled={disabled || isTranscribing}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-xl cursor-pointer ${
            isRecording
              ? "bg-amber-500 text-black scale-110 ring-4 ring-amber-400/50 shadow-amber-500/50"
              : isTranscribing
              ? "bg-emerald-700 text-white animate-pulse"
              : "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white hover:scale-105 hover:shadow-emerald-500/30"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isTranscribing ? (
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          ) : isRecording ? (
            <div className="w-5 h-5 bg-black rounded-sm" />
          ) : (
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
      </div>

      <span className="text-xs font-medium text-[#9AA6A2] uppercase tracking-wider">
        {isRecording
          ? "Recording... (Click to stop)"
          : isTranscribing
          ? "Transcribing with Sarvam..."
          : "Tap mic to speak (Hindi / English)"}
      </span>
    </div>
  );
}
