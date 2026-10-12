
package com.filehub.api.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.filehub.api.services.StatisticsService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = "statistics")
public class StatisticsController {
    private final StatisticsService statisticsService;

    @Autowired
    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/top-buckets")
    public ResponseEntity<List<String>> getTopBuckets() {
        try {
            List<String> topBuckets = statisticsService.getTopBuckets();
            return ResponseEntity.ok(topBuckets);
        } catch (Exception e) {
            System.err.println("Error fetching top buckets: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(null);
        }
    }

    @GetMapping("/activity")
    public ResponseEntity<Map<String, Object>> getActivity() {
        Map<String, Object> activity = statisticsService.getActivity();
        return ResponseEntity.ok(activity);
    }

     @GetMapping("/used-storage")
    public ResponseEntity<Long> getUsedStorage() {
        try {
            Long usedStorage = statisticsService.getUsedStorage();
            return ResponseEntity.ok(usedStorage);
        } catch (Exception e) {
            System.err.println("Error fetching used storage: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(null);
        }
    }


    @GetMapping("/login-status")
    public ResponseEntity<Map<String, Long>> getLoginStatusCounts() {
        Map<String, Long> loginStatusCounts = statisticsService.getLoginStatusCounts();
        return ResponseEntity.ok(loginStatusCounts);
    }


}