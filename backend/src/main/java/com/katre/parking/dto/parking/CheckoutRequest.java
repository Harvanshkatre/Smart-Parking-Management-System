package com.katre.parking.dto.parking;

import lombok.Data;

@Data
public class CheckoutRequest {
    private String ticketCode;
    private String vehicleNumber;
    private String paymentMethod; // Default to CASH if not provided
}
