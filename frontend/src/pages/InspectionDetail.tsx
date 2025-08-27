import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, CheckCircle, Eye, AlertTriangle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Layout from "@/components/Layout";

// NOTE: demo fallbacks removed to avoid undefined variables
// import baselineThermalImage from "@/assets/baseline-thermal.jpg";
// import currentThermalImage from "@/assets/current-thermal.jpg";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const InspectionDetail = () => {
  const { id, inspectionId } = useParams();
  const navigate = useNavigate();

  // Initial fetch state
  const [loadingImages, setLoadingImages] = useState(true);

  // Whether *both* baseline & current exist (for comparison UI)
  const [hasExistingImages, setHasExistingImages] = useState<boolean>(false);

  // Track existence of each image explicitly (for redirect decision)
  const [hasBaselineImage, setHasBaselineImage] = useState<boolean | null>(null);
  const [hasCurrentImage, setHasCurrentImage] = useState<boolean | null>(null);

  // Image object-URLs we render
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  // Per-image loading/error
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);

  // Timestamps for captions
  const [baselineTakenAt, setBaselineTakenAt] = useState<Date | null>(null);
  const [currentTakenAt, setCurrentTakenAt] = useState<Date | null>(null);

  // Upload simulation state (kept as-is for the “else” UI)
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // File input and preview for simulated upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const uploadIntervalRef = useRef<number | null>(null);

  // Track blob URLs to revoke safely
  const pendingRevoke = useRef<string[]>([]);
  const lastBaselineUrlRef = useRef<string | null>(null);
  const lastCurrentUrlRef = useRef<string | null>(null);
  const lastPreviewUrlRef = useRef<string | null>(null);

  // Keep refs in sync with latest state
  useEffect(() => { lastBaselineUrlRef.current = baselineUrl; }, [baselineUrl]);
  useEffect(() => { lastCurrentUrlRef.current = currentUrl; }, [currentUrl]);
  useEffect(() => { lastPreviewUrlRef.current = previewUrl; }, [previewUrl]);

  // Format caption datetime
  const fmt = (d: Date | null) => (d ? d.toLocaleString(undefined, { hour12: true }) : "");

  // Turn relative media URL into absolute API URL
  const absolutize = (u?: string | null) => {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  // Download a URL to an object URL
  async function downloadToObjectUrl(src: string): Promise<string> {
    const resp = await fetch(src, {
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "image/*" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  // Show comparison only if both exist
  const canShowComparison = Boolean(baselineUrl && currentUrl);

  // Fetch JSON metadata, then download images as blobs
  useEffect(() => {
    let aborted = false;

    const run = async () => {
      if (!inspectionId) {
        setLoadingImages(false);
        return;
      }
      setBaselineLoading(true);
      setCurrentLoading(true);
      setBaselineError(null);
      setCurrentError(null);

      try {
        const qs = new URLSearchParams({
          inspectionId,
          ...(id ? { transformerNo: id } : {}),
        }).toString();

        const res = await fetch(`${API_BASE}/api/get-inspection?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const baselineSrc = absolutize(data?.baselineImage);
        const currentSrc  = absolutize(data?.currentImage);

        // timestamps (if your API returns these)
        if (data?.baselineTimestamp) setBaselineTakenAt(new Date(data.baselineTimestamp));
        if (data?.currentTimestamp)  setCurrentTakenAt(new Date(data.currentTimestamp));

        // existence flags (used for redirect decision)
        const _hasBaseline = Boolean(baselineSrc);
        const _hasCurrent  = Boolean(currentSrc);
        if (!aborted) {
          setHasBaselineImage(_hasBaseline);
          setHasCurrentImage(_hasCurrent);
          setHasExistingImages(_hasBaseline && _hasCurrent);
        }

        // Baseline
        if (baselineSrc) {
          try {
            const blobUrl = await downloadToObjectUrl(baselineSrc);
            if (!aborted) {
              setBaselineUrl(prev => {
                if (prev?.startsWith("blob:")) pendingRevoke.current.push(prev);
                return blobUrl;
              });
              setBaselineLoading(false);
            }
          } catch (e: any) {
            if (!aborted) {
              setBaselineError(e?.message || "Failed to load image");
              setBaselineUrl(null);
              setBaselineLoading(false);
            }
          }
        } else {
          if (!aborted) {
            setBaselineUrl(null);
            setBaselineLoading(false);
          }
        }

        // Current
        if (currentSrc) {
          try {
            const blobUrl = await downloadToObjectUrl(currentSrc);
            if (!aborted) {
              setCurrentUrl(prev => {
                if (prev?.startsWith("blob:")) pendingRevoke.current.push(prev);
                return blobUrl;
              });
              setCurrentLoading(false);
            }
          } catch (e: any) {
            if (!aborted) {
              setCurrentError(e?.message || "Failed to load image");
              setCurrentUrl(null);
              setCurrentLoading(false);
            }
          }
        } else {
          if (!aborted) {
            setCurrentUrl(null);
            setCurrentLoading(false);
          }
        }
      } catch {
        // On API error: treat as "no current image"
        if (!aborted) {
          setHasBaselineImage(null);
          setHasCurrentImage(false);
          setHasExistingImages(false);
          setBaselineLoading(false);
          setCurrentLoading(false);
        }
      } finally {
        if (!aborted) setLoadingImages(false);
      }
    };

    run();
    return () => { aborted = true; };
  }, [id, inspectionId]);

  // 🔁 Redirect to /thermal-upload when there is NO current image
  useEffect(() => {
    if (loadingImages) return;
    if (hasCurrentImage === false) {
      navigate(`/transformer/${id}/inspection/${inspectionId}/thermal-upload`, { replace: true });
    }
  }, [loadingImages, hasCurrentImage, id, inspectionId, navigate]);

  // Final cleanup on unmount only
  useEffect(() => {
    return () => {
      // schedule latest urls for revoke
      const latest = [
        lastPreviewUrlRef.current,
        lastBaselineUrlRef.current,
        lastCurrentUrlRef.current,
      ];
      latest.forEach(u => {
        if (u && u.startsWith("blob:")) pendingRevoke.current.push(u);
      });

      // revoke all
      pendingRevoke.current.forEach(u => {
        try { URL.revokeObjectURL(u); } catch {}
      });
      pendingRevoke.current = [];

      if (uploadIntervalRef.current) {
        window.clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
    };
  }, []);

  // File picker
  const handlePickFile = () => fileInputRef.current?.click();

  // Handle chosen file (simulated upload)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const url = URL.createObjectURL(file);
    setPreviewUrl(prev => {
      if (prev?.startsWith("blob:")) pendingRevoke.current.push(prev);
      return url;
    });
    setCurrentTakenAt(new Date());
    startUpload(file);
  };

  // Simulate upload progress for current image
  const startUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);

    const blobUrl = URL.createObjectURL(file);
    setCurrentUrl(prev => {
      if (prev?.startsWith("blob:")) pendingRevoke.current.push(prev);
      return blobUrl;
    });

    if (uploadIntervalRef.current) {
      window.clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    const intervalId = window.setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          window.clearInterval(intervalId);
          uploadIntervalRef.current = null;
          setIsUploading(false);
          setUploadComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    uploadIntervalRef.current = intervalId;
  };

  // Cancel simulated upload
  const handleCancelUpload = () => {
    if (uploadIntervalRef.current) {
      window.clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);

    setCurrentUrl(prev => {
      if (prev?.startsWith("blob:")) pendingRevoke.current.push(prev);
      return null;
    });
    setPreviewUrl(prev => {
      if (prev?.startsWith("blob:")) pendingRevoke.current.push(prev);
      return null;
    });
    setCurrentTakenAt(null);
  };

  if (loadingImages) {
    return (
      <Layout title="Transformer">
        <div className="p-6">
          <div className="text-sm text-muted-foreground">Loading inspection data...</div>
        </div>
      </Layout>
    );
  }

  // If we got here and hasCurrentImage === false, the redirect effect will fire.
  // We still render something quickly (nothing fancy) to avoid a flash.
  if (hasCurrentImage === false) {
    return (
      <Layout title="Transformer">
        <div className="p-6 text-sm text-muted-foreground">Redirecting to upload…</div>
      </Layout>
    );
  }

  // Simple image block with loader and error states
  const ImageBlock = ({
    src,
    alt,
    loading,
    error,
    caption,
  }: {
    src: string | null;
    alt: string;
    loading: boolean;
    error: string | null;
    caption: string;
  }) => (
    <div className="relative rounded-lg overflow-hidden">
      {loading && (
        <div className="aspect-[4/3] w-full animate-pulse rounded-md border bg-muted/40" />
      )}
      {!loading && error && (
        <div className="aspect-[4/3] w-full rounded-md border flex items-center justify-center text-sm text-red-600">
          {error}
        </div>
      )}
      {!loading && !error && src && (
        <img
          src={src}
          alt={alt}
          className="w-full aspect-[4/3] object-cover rounded-md border"
        />
      )}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
        {caption}
      </span>
    </div>
  );

  const canShow = hasExistingImages && canShowComparison;

  return (
    <Layout title="Transformer">
      <div className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => navigate(`/transformer/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transformer
        </Button>

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
                <span className="h-2 w-2 rounded-full bg-success"></span>
                Inspection in progress
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {baselineUrl && (
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
              )}
            </div>
          </div>
        </div>

        {canShow ? (
          <div className="mt-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Thermal Image Comparison</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Square className="h-4 w-4" />
                  Annotation Tools
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Baseline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageBlock
                    src={baselineUrl}
                    alt="Baseline"
                    loading={baselineLoading}
                    error={baselineError}
                    caption={fmt(baselineTakenAt) || "1/8/2025 9:10:18 PM"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Current</CardTitle>
                    {hasExistingImages && !currentLoading && !currentError && (
                      <Badge variant="destructive" className="gap-2">
                        <AlertTriangle className="h-3 w-3" />
                        Anomaly Detected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative rounded-lg overflow-hidden">
                    <ImageBlock
                      src={currentUrl}
                      alt="Current"
                      loading={currentLoading}
                      error={currentError}
                      caption={fmt(currentTakenAt) || "5/7/2025 8:34:21 PM"}
                    />
                    {hasExistingImages && !currentLoading && !currentError && (
                      <>
                        <div className="pointer-events-none absolute top-4 left-4 bg-red-500/20 border-2 border-red-500 rounded w-20 h-16"></div>
                        <div className="pointer-events-none absolute bottom-12 right-6 bg-red-500/20 border-2 border-red-500 rounded w-24 h-20"></div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Fallback content if somehow both images aren't present but we didn't redirect
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Thermal Image</CardTitle>
              </CardHeader>

              {!isUploading && !uploadComplete && (
                <CardContent className="space-y-6">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Selected preview"
                      className="mx-auto w-full max-h-80 object-contain rounded-md border"
                    />
                  )}

                  <div>
                    <Badge className="mb-2 bg-warning text-warning-foreground">Pending</Badge>
                    <p className="text-sm text-muted-foreground">
                      Upload a maintenance image of the transformer to identify potential issues.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weather">Weather Condition</Label>
                    <Select defaultValue="sunny">
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

                  <Button className="w-full gap-2" size="lg" onClick={handlePickFile}>
                    <Upload className="h-4 w-4" />
                    Upload maintenance image
                  </Button>

                  <div className="space-y-4">
                    <h3 className="font-medium">Progress</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-warning p-1">
                          <Upload className="h-3 w-3 text-warning-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Thermal Image Upload</div>
                          <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                        <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-1">
                          <div className="h-3 w-3"></div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-muted-foreground">AI Analysis</div>
                          <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-1">
                          <div className="h-3 w-3"></div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-muted-foreground">Thermal Image Review</div>
                          <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}

              {isUploading && (
                <CardContent className="space-y-6">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="mx-auto w-full max-h-80 object-contain rounded-md border"
                    />
                  )}

                  <div className="text-center space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Image uploading.</h3>
                      <p className="text-sm text-muted-foreground">
                        Maintenance image is being uploaded and reviewed.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="w-full" />
                      <div className="text-sm text-muted-foreground">{uploadProgress}%</div>
                    </div>

                    <Button variant="outline" onClick={handleCancelUpload}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              )}

              {uploadComplete && !isUploading && (
                <CardContent className="space-y-6">
                  {currentUrl && (
                    <img
                      src={currentUrl}
                      alt="Uploaded preview"
                      className="mx-auto w-full max-h-80 object-contain rounded-md border"
                    />
                  )}

                  <div className="text-center space-y-4">
                    <CheckCircle className="h-16 w-16 text-success mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">Upload Complete</h3>
                      <p className="text-sm text-muted-foreground">
                        The maintenance image has been uploaded successfully.
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InspectionDetail;
