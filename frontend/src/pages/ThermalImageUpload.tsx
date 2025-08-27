import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Layout from "@/components/Layout";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Tune these to taste
const MIN_UPLOAD_TIME = 2200;   // ms: minimum time to keep progress on screen
const SUCCESS_HOLD     = 900;   // ms: time to show the "Upload Complete" state

const ThermalImageUpload = () => {
  const { id, inspectionId } = useParams();
  const navigate = useNavigate();

  // Get current user information
  const user = localStorage.getItem("user");
  const userData = user ? JSON.parse(user) : null;
  const uploaderName = userData?.username || userData?.email || "admin";

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inspectionStatus, setInspectionStatus] = useState<"IN_PROGRESS" | "COMPLETED">("IN_PROGRESS");
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Faux progress interval (for smooth effect when real progress is missing/quick)
  const simIntervalRef = useRef<number | null>(null);

  // Finishing animation / timing
  const startedAtRef = useRef<number>(0);
  const finishIntervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const redirectTimeoutRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);
  useEffect(() => { progressRef.current = uploadProgress; }, [uploadProgress]);

  // Images (for header + preview)
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  // Timestamps (captions)
  const [baselineTakenAt, setBaselineTakenAt] = useState<Date | null>(null);
  const [currentTakenAt, setCurrentTakenAt] = useState<Date | null>(null);

  // File picker & preview
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Weather condition state
  const [weatherCondition, setWeatherCondition] = useState<string>("sunny");

  // Helpers
  const fmt = (d: Date | null) => (d ? d.toLocaleString(undefined, { hour12: true }) : "");
  const absolutize = (u?: string | null) => {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  // Fetch baseline image (adjust to your API)
  useEffect(() => {
    const fetchBaseline = async () => {
      if (!id) return;
      try {
        const res = await fetch(`${API_BASE}/api/transformers/${id}/baseline`);
        if (res.ok) {
          const data = await res.json();
          const url = absolutize(data?.url);
          if (url) setBaselineUrl(url);
          const ts = (data?.uploadedAt ?? data?.createdAt ?? data?.takenAt) as string | number | undefined;
          if (ts) setBaselineTakenAt(new Date(ts));
        }
      } catch { /* ignore baseline failure */ }
    };
    fetchBaseline();
  }, [id]);

  // Cleanup previews/timers
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (currentUrl?.startsWith("blob:")) URL.revokeObjectURL(currentUrl);
      if (simIntervalRef.current) { window.clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
      if (finishIntervalRef.current) { window.clearInterval(finishIntervalRef.current); finishIntervalRef.current = null; }
      if (finishTimeoutRef.current) { window.clearTimeout(finishTimeoutRef.current); finishTimeoutRef.current = null; }
      if (redirectTimeoutRef.current) { window.clearTimeout(redirectTimeoutRef.current); redirectTimeoutRef.current = null; }
    };
  }, [previewUrl, currentUrl]);

  // Open file chooser
  const handlePickFile = () => fileInputRef.current?.click();

  // Handle chosen file -> preview -> real upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow selecting same file again

    const url = URL.createObjectURL(file);
    setPreviewUrl(prev => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    setCurrentTakenAt(new Date());

    startUpload(file);
  };

  const startSimProgress = () => {
    if (simIntervalRef.current) { window.clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
    // Ease towards ~95% while waiting for real progress/response
    simIntervalRef.current = window.setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) return prev;
        const delta = Math.max(1, Math.round((95 - prev) * 0.06));
        return Math.min(95, prev + delta);
      });
    }, 180);
  };

  const stopSimProgress = () => {
    if (simIntervalRef.current) { window.clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
  };

  // Smooth finish to 100 over "remaining" ms
  const finishToHundred = (remainingMs: number) => {
    if (finishIntervalRef.current) { window.clearInterval(finishIntervalRef.current); finishIntervalRef.current = null; }
    if (remainingMs <= 0) {
      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);
      setInspectionStatus("COMPLETED");
      redirectTimeoutRef.current = window.setTimeout(() => {
        window.location.href = `/transformer/${id}/inspection/${inspectionId}`;
      }, SUCCESS_HOLD);
      return;
    }

    const intervalMs = 90;
    const steps = Math.max(1, Math.floor(remainingMs / intervalMs));
    const start = progressRef.current;
    const target = 99; // leave a tiny gap for the final tick
    const totalDelta = Math.max(0, target - start);
    const perStep = totalDelta / steps;

    let tick = 0;
    finishIntervalRef.current = window.setInterval(() => {
      tick += 1;
      setUploadProgress(prev => Math.min(target, Math.max(prev, Math.round(start + perStep * tick))));
      if (tick >= steps) {
        if (finishIntervalRef.current) { window.clearInterval(finishIntervalRef.current); finishIntervalRef.current = null; }
        finishTimeoutRef.current = window.setTimeout(() => {
          setUploadProgress(100);
          setIsUploading(false);
          setUploadComplete(true);
          setInspectionStatus("COMPLETED");
          redirectTimeoutRef.current = window.setTimeout(() => {
            window.location.href = `/transformer/${id}/inspection/${inspectionId}`;
          }, SUCCESS_HOLD);
        }, 80);
      }
    }, intervalMs);
  };

  // REAL upload with progress (plus smooth fallback + minimum duration)
  const startUpload = (file: File) => {
    if (!id || !inspectionId) {
      setUploadError("Missing transformer or inspection id");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadError(null);

    // Show an "uploaded preview" while uploading
    const blobUrl = URL.createObjectURL(file);
    setCurrentUrl(prev => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return blobUrl;
    });

    const params = new URLSearchParams({ transformer_id: id, inspection_no: inspectionId });
    const url = `${API_BASE}/api/upload-thermal-image?${params.toString()}`;

    const form = new FormData();
    form.append("file", file, file.name);
    form.append("uploaderName", uploaderName);
    form.append("weatherCondition", weatherCondition);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.open("POST", url, true);
    // xhr.withCredentials = true; // if you need auth cookies

    startedAtRef.current = performance.now();

    // Start faux progress right away
    startSimProgress();

    xhr.upload.onprogress = (evt) => {
      const elapsed = performance.now() - startedAtRef.current;
      if (!evt.lengthComputable) return; // keep faux progress
      const pct = Math.round((evt.loaded / evt.total) * 100);
      // Before the min time, never show 100% (cap at 98)
      const capped = elapsed < MIN_UPLOAD_TIME ? Math.min(pct, 98) : pct;
      setUploadProgress(prev => Math.max(prev, capped));
    };

    xhr.onload = () => {
      stopSimProgress();
      xhrRef.current = null;

      const elapsed = performance.now() - startedAtRef.current;
      const remaining = Math.max(0, MIN_UPLOAD_TIME - elapsed);

      if (xhr.status >= 200 && xhr.status < 300) {
        // Smoothly finish to 100 over the remaining time
        finishToHundred(remaining);
      } else {
        // Fail fast
        if (finishIntervalRef.current) { window.clearInterval(finishIntervalRef.current); finishIntervalRef.current = null; }
        setIsUploading(false);
        setUploadError(`Upload failed (HTTP ${xhr.status})`);
      }
    };

    xhr.onerror = () => {
      stopSimProgress();
      xhrRef.current = null;
      if (finishIntervalRef.current) { window.clearInterval(finishIntervalRef.current); finishIntervalRef.current = null; }
      setIsUploading(false);
      setUploadError("Network error during upload");
    };

    xhr.send(form);
  };

  // Cancel upload (abort XHR)
  const handleCancelUpload = () => {
    try { xhrRef.current?.abort(); } catch {}
    xhrRef.current = null;

    stopSimProgress();
    if (finishIntervalRef.current) { window.clearInterval(finishIntervalRef.current); finishIntervalRef.current = null; }
    if (finishTimeoutRef.current) { window.clearTimeout(finishTimeoutRef.current); finishTimeoutRef.current = null; }
    if (redirectTimeoutRef.current) { window.clearTimeout(redirectTimeoutRef.current); redirectTimeoutRef.current = null; }

    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadError(null);

    if (currentUrl?.startsWith("blob:")) URL.revokeObjectURL(currentUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

    setCurrentUrl(null);
    setPreviewUrl(null);
    setCurrentTakenAt(null);
  };

  return (
    <Layout title="Transformer">
      {/* local keyframes for shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div className="p-6">
        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Back */}
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => navigate(`/transformer/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transformer
        </Button>

        {/* Header with baseline preview button */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                {inspectionId}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Last updated: Mon(21), May, 2023 12:55pm
              </span>
              <Badge variant="outline" className="gap-2">
                <span className={`h-2 w-2 rounded-full ${inspectionStatus === "COMPLETED" ? "bg-green-500" : "bg-yellow-500"}`}></span>
                {inspectionStatus === "COMPLETED" ? "Inspection completed" : "Inspection in progress"}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {baselineUrl ? (
                <>
                  <img
                    src={baselineUrl}
                    alt="Baseline preview"
                    className="h-10 w-10 rounded object-cover border"
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Baseline Image
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Baseline Image</DialogTitle>
                      </DialogHeader>
                      <img
                        src={baselineUrl}
                        alt="Baseline"
                        className="w-full max-h-[75vh] object-contain rounded-md"
                      />
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <span className="text-sm text-muted-foreground"></span>
              )}
            </div>
          </div>
        </div>

        {/* Upload card */}
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Thermal Image</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="relative">
                {previewUrl && (
                  <>
                    <img
                      src={previewUrl}
                      alt="Selected preview"
                      className="mx-auto w-full max-h-80 object-contain rounded-md border"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 rounded-md bg-black/5 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="text-xs px-2 py-1 rounded bg-black/60 text-white">
                          Uploading…
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {uploadError && (
                <div className="text-sm text-red-600">{uploadError}</div>
              )}

              <div>
                <Badge className="mb-2 bg-warning text-warning-foreground">
                  {isUploading ? "Uploading" : uploadComplete ? "Completed" : "Pending"}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Upload a maintenance image of the transformer to identify potential issues.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weather">Weather Condition</Label>
                <Select value={weatherCondition} onValueChange={setWeatherCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunny">Sunny</SelectItem>
                    <SelectItem value="cloudy">Cloudy</SelectItem>
                    <SelectItem value="rainy">Rainy</SelectItem>
                    <SelectItem value="windy">Windy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isUploading && !uploadComplete && (
                <Button className="w-full gap-2" size="lg" onClick={handlePickFile}>
                  <Upload className="h-4 w-4" />
                  Upload maintenance image
                </Button>
              )}

              {isUploading && (
                <div className="text-center space-y-4">
                  <div className="relative w-full">
                    <Progress value={uploadProgress} className="w-full" />
                    {/* shimmer overlay */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
                      <div
                        style={{
                          width: "35%",
                          height: "100%",
                          opacity: 0.18,
                          background: "white",
                          animation: "shimmer 1.2s linear infinite",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{uploadProgress}%</div>
                  <Button variant="outline" onClick={handleCancelUpload}>
                    Cancel
                  </Button>
                </div>
              )}

              {uploadComplete && !isUploading && currentUrl && (
                <div className="text-center space-y-4">
                  <img
                    src={currentUrl}
                    alt="Uploaded preview"
                    className="mx-auto w-full max-h-80 object-contain rounded-md border"
                  />
                  <CheckCircle className="h-16 w-16 text-success mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium">Upload Complete</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Thermal image uploaded successfully
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        Inspection status updated to Completed
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Redirecting to the inspection page…
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ThermalImageUpload;
