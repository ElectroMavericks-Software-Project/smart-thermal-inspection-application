package com.example.sti.controller;

import com.example.sti.dto.InspectionReq;
import com.example.sti.entity.Inspection;
import com.example.sti.entity.InspectionStatus;
import com.example.sti.entity.Transformer;
import com.example.sti.repo.InspectionRepository;
import com.example.sti.repo.TransformerRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api")
public class InspectionController {

    private final TransformerRepository transformers;
    private final InspectionRepository inspections;

    public InspectionController(TransformerRepository transformers,
                                InspectionRepository inspections) {
        this.transformers = transformers;
        this.inspections = inspections;
    }

    /** Create a new inspection for a transformer (by transformerNo). */
    @PostMapping("/transformers/{no}/inspections")
    public ResponseEntity<?> create(@PathVariable String no,
                                    @Valid @RequestBody InspectionReq req) {

        Transformer t = transformers.findByTransformerNo(no).orElse(null);
        if (t == null) return ResponseEntity.notFound().build();

        Inspection i = new Inspection();
        i.setTransformer(t);

        // inspectedAt: use provided or now()
        i.setInspectedAt(req.inspectedAt != null ? req.inspectedAt : Instant.now());

        // NEW: maintenance date
        i.setMaintenanceAt(req.maintenanceDate);

        // status: default IN_PROGRESS if not provided
        i.setStatus(req.status != null ? req.status : InspectionStatus.IN_PROGRESS);

        i.setNotes(req.notes);
        i.setStarred(Boolean.TRUE.equals(req.starred));

        Inspection saved = inspections.save(i);
        return ResponseEntity.ok(saved);
    }

    /** List inspections for a transformer (newest first). */
    @GetMapping("/transformers/{no}/inspections")
    public ResponseEntity<?> list(@PathVariable String no) {
        Transformer t = transformers.findByTransformerNo(no).orElse(null);
        if (t == null) return ResponseEntity.notFound().build();

        List<Inspection> list = inspections.findByTransformerOrderByInspectedAtDesc(t);
        return ResponseEntity.ok(list);
    }

    /** Get single inspection by id. */
    @GetMapping("/inspections/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return inspections.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Partial update (PATCH) of an inspection. */
    @PatchMapping("/inspections/{id}")
    public ResponseEntity<?> patch(@PathVariable Long id,
                                   @RequestBody Map<String, Object> body) {
        Inspection i = inspections.findById(id).orElse(null);
        if (i == null) return ResponseEntity.notFound().build();

        // status (case-insensitive)
        if (body.containsKey("status")) {
            InspectionStatus st = parseStatus(body.get("status"));
            if (st != null) i.setStatus(st);
        }

        if (body.containsKey("notes")) {
            i.setNotes(Objects.toString(body.get("notes"), null));
        }

        if (body.containsKey("starred")) {
            i.setStarred(Boolean.parseBoolean(String.valueOf(body.get("starred"))));
        }

        if (body.containsKey("inspectedAt")) {
            Instant ts = parseInstant(body.get("inspectedAt"));
            if (ts != null) i.setInspectedAt(ts);
        }

        // NEW: maintenanceDate (ISO-8601 string or null to clear)
        if (body.containsKey("maintenanceDate")) {
            Object v = body.get("maintenanceDate");
            if (v == null || String.valueOf(v).isBlank()) {
                i.setMaintenanceAt(null);
            } else {
                Instant ts = parseInstant(v);
                if (ts != null) i.setMaintenanceAt(ts);
            }
        }

        return ResponseEntity.ok(inspections.save(i));
    }

    /** Delete an inspection. */
    @DeleteMapping("/inspections/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!inspections.existsById(id)) return ResponseEntity.notFound().build();
        inspections.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // -------- helpers --------

    private static Instant parseInstant(Object v) {
        try {
            if (v == null) return null;
            String s = String.valueOf(v).trim();
            if (s.isEmpty()) return null;
            return Instant.parse(s);
        } catch (Exception e) {
            return null;
        }
    }

    private static InspectionStatus parseStatus(Object v) {
        if (v == null) return null;
        try {
            return InspectionStatus.valueOf(String.valueOf(v).trim().toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }
}
