package com.filehub.api.controllers;

import com.filehub.api.dtos.BucketStatisticsDTO;
import com.filehub.api.services.BucketStatisticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/buckets")
public class BucketStatisticsController {

    private final BucketStatisticsService bucketStatisticsService;

    @Autowired
    public BucketStatisticsController(BucketStatisticsService bucketStatisticsService) {
        this.bucketStatisticsService = bucketStatisticsService;
    }

    @GetMapping("/{bucketName}/statistics")
    public ResponseEntity<BucketStatisticsDTO> getBucketStatistics(@PathVariable String bucketName) {
        try {
            BucketStatisticsDTO statistics = bucketStatisticsService.getBucketStatistics(bucketName);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }
}
