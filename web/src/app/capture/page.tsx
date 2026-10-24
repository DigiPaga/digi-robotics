"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CapturePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert(
        "No se pudo acceder a la cámara. Asegúrate de dar permisos y usar HTTPS o localhost.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async () => {
    if (!previewUrl) return;
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const mockWallet = "0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1";
      const presignRes = await fetch("/api/clips/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: mockWallet,
          mimeType: blob.type,
          sizeBytes: blob.size,
        }),
      });
      if (!presignRes.ok) throw new Error("Failed to get presigned URL");
      const { uploadUrl } = await presignRes.json();
      setUploadProgress(40);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", blob.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable)
            setUploadProgress(40 + (event.loaded / event.total) * 60);
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve(true)
            : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(blob);
      });
      setUploadProgress(100);
      alert("¡Video subido con éxito a Supabase y registrado en Neon!");
      router.push("/creator");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error al subir el video. Inténtalo de nuevo.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-white p-4 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-6 text-[var(--primary)]">
        Capture Video
      </h1>
      {!previewUrl ? (
        <div className="w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden relative border border-white/10">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isRecording ? "" : "hidden"}`}
          />
          {!isRecording && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              Video screen
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
          <video src={previewUrl} controls className="w-full h-full" />
        </div>
      )}
      <div className="mt-8 flex flex-col gap-4 w-full max-w-md">
        {!previewUrl ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-full py-4 rounded-full font-bold text-lg transition-all ${isRecording ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "bg-[var(--primary)] hover:opacity-90 text-[var(--page-bg)]"}`}
          >
            {isRecording ? "⏹ Stop Recording" : "🎥 Start Recording"}
          </button>
        ) : (
          <>
            <button
              onClick={uploadVideo}
              disabled={isUploading}
              className="w-full py-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50"
            >
              {isUploading
                ? `Subiendo... ${Math.round(uploadProgress)}%`
                : "✅ Subir y Guardar"}
            </button>
            <button
              onClick={() => {
                setPreviewUrl(null);
                setUploadProgress(0);
              }}
              disabled={isUploading}
              className="w-full py-3 rounded-full border border-white/20 hover:bg-white/5 text-white/70 disabled:opacity-50"
            >
              🔄 Grabar de nuevo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
