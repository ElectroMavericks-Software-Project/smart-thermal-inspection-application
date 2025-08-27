import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ZoomIn, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";

const ThermalImageAnalysis = () => {
  const { id, inspectionId } = useParams();
  const navigate = useNavigate();
  const [annotationTools, setAnnotationTools] = useState(true);

  return (
    <Layout title="Transformer">
      <div className="p-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-4 gap-2" 
          onClick={() => navigate(`/transformer/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transformer
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
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
          
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Transformer No</div>
              <div className="font-medium">AZ-8370</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Pole No</div>
              <div className="font-medium">EN-122-A</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Branch</div>
              <div className="font-medium">Nugegoda</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Inspected By</div>
              <div className="font-medium">A-110</div>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Thermal Image Comparison</CardTitle>
              <Button variant="outline" size="icon">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Baseline Image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Baseline</Badge>
                  </div>
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-lg relative overflow-hidden">
                    {/* Simulated thermal image */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-600/30 to-cyan-400/40"></div>
                    <div className="absolute bottom-4 left-4 text-white text-xs">1/6/2025 9:10:08 PM</div>
                    <div className="absolute top-4 right-4 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
                      32°C
                    </div>
                  </div>
                </div>

                {/* Current Image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-destructive text-destructive-foreground gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      Anomaly Detected
                    </Badge>
                  </div>
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-lg relative overflow-hidden">
                    {/* Simulated thermal image with hotspot */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-600/30 to-cyan-400/40"></div>
                    {/* Hot spot areas */}
                    <div className="absolute top-1/3 right-1/4 w-16 h-12 bg-gradient-to-br from-red-500 to-orange-400 rounded border-2 border-red-400"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-12 h-10 bg-gradient-to-br from-orange-400 to-yellow-300 rounded border-2 border-orange-400"></div>
                    <div className="absolute bottom-4 left-4 text-white text-xs">5/7/2025 8:34:21 PM</div>
                    <div className="absolute top-4 right-4 bg-red-600/80 text-white text-xs px-2 py-1 rounded">
                      85°C
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="annotation-tools" className="text-sm font-medium">
                    Annotation Tools
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable tools to mark and annotate thermal anomalies
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Switch 
                    id="annotation-tools"
                    checked={annotationTools}
                    onCheckedChange={setAnnotationTools}
                  />
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-destructive"></div>
                  <span className="text-sm font-medium">Critical Hotspot</span>
                </div>
                <div className="text-2xl font-bold text-destructive">85°C</div>
                <div className="text-xs text-muted-foreground">Maximum temperature detected</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-warning"></div>
                  <span className="text-sm font-medium">Average Temperature</span>
                </div>
                <div className="text-2xl font-bold text-warning">42°C</div>
                <div className="text-xs text-muted-foreground">Across the transformer surface</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span className="text-sm font-medium">Baseline Comparison</span>
                </div>
                <div className="text-2xl font-bold text-destructive">+53°C</div>
                <div className="text-xs text-muted-foreground">Temperature increase detected</div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Analysis Summary & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-medium text-destructive mb-2">Critical Issue Detected</h4>
                <p className="text-sm text-muted-foreground">
                  Significant temperature increase of 53°C detected in transformer windings. 
                  Immediate maintenance required to prevent equipment failure.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Recommended Actions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Schedule immediate inspection of transformer cooling system</li>
                  <li>• Check oil levels and quality</li>
                  <li>• Verify load distribution and reduce if necessary</li>
                  <li>• Plan maintenance window within 24-48 hours</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="destructive">Generate Maintenance Report</Button>
                <Button variant="outline">Schedule Maintenance</Button>
                <Button variant="outline">Export Analysis</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ThermalImageAnalysis;