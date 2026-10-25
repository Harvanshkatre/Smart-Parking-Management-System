package com.katre.parking.dto.parking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class EntryRequest {

    @NotBlank(message = "Vehicle number is required")
    @Pattern(regexp = "^[A-Za-z]{2}[A-Za-z0-9\\s\\-]{4,10}$", message = "Invalid Indian vehicle number structure")
    private String vehicleNumber;

    @NotBlank(message = "Vehicle type is required")
    @Pattern(regexp = "^(Bike|Car)$", message = "Vehicle type must be Bike or Car")
    private String vehicleType;
}
