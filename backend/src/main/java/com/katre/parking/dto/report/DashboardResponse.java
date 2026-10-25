package com.katre.parking.dto.report;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardResponse {
    private long activeParking;
    private long todayEntries;
    private long todayExits;
    private double todayRevenue;
    private long bikeCount;
    private long carCount;
    private long totalSlots;
    private long occupiedSlots;
    private long availableSlots;
}
