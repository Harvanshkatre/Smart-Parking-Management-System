package com.katre.parking.dto.payment;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentRequest {
    @NotBlank
    private String paymentMethod; // CASH, UPI, CARD
}
