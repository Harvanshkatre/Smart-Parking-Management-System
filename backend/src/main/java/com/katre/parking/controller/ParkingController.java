package com.katre.parking.controller;

import com.katre.parking.dto.parking.CheckoutRequest;
import com.katre.parking.dto.parking.EntryRequest;
import com.katre.parking.dto.parking.ParkingResponse;
import com.katre.parking.service.ParkingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/parking")
@RequiredArgsConstructor
public class ParkingController {

    private final ParkingService parkingService;

    @PostMapping("/entry")
    public ResponseEntity<ParkingResponse> entry(@Valid @RequestBody EntryRequest request) {
        ParkingResponse response = parkingService.processEntry(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/checkout")
    public ResponseEntity<ParkingResponse> checkout(@RequestBody CheckoutRequest request) {
        ParkingResponse response = parkingService.processCheckout(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/records")
    public ResponseEntity<java.util.List<ParkingResponse>> getRecords() {
        return ResponseEntity.ok(parkingService.getAllRecords());
    }
}
