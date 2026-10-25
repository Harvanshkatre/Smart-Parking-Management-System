package com.katre.parking.dto.parking;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ParkingResponse {
    private String ticketCode;
    private String vehicleNumber;
    private String vehicleType;
    private String slotNumber;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private Long durationMinutes;
    private String durationText;
    private Double fee;
    private String paymentStatus;
    private String status;
}
