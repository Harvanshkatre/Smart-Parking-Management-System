package com.katre.parking.service;

import com.katre.parking.dto.parking.CheckoutRequest;
import com.katre.parking.dto.parking.EntryRequest;
import com.katre.parking.dto.parking.ParkingResponse;
import com.katre.parking.entity.*;
import com.katre.parking.exception.ApiException;
import com.katre.parking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParkingService {

    private final VehicleRepository vehicleRepository;
    private final ParkingTicketRepository ticketRepository;
    private final ParkingSlotRepository slotRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public ParkingResponse processEntry(EntryRequest request) {
        String normalizedNumber = normalizeVehicleNumber(request.getVehicleNumber());

        if (ticketRepository.existsByVehicleNumberAndStatus(normalizedNumber, "ACTIVE")) {
            throw new ApiException("Vehicle is already parked.", 400);
        }

        ParkingSlot slot = slotRepository.findFirstByVehicleTypeAndStatusOrderBySlotNumberAsc(request.getVehicleType(), "AVAILABLE")
                .orElseThrow(() -> new ApiException(request.getVehicleType() + " parking is currently full.", 400));

        slot.setStatus("OCCUPIED");
        slotRepository.save(slot);

        Vehicle vehicle = vehicleRepository.findByVehicleNumber(normalizedNumber)
                .orElseGet(() -> {
                    Vehicle newVehicle = new Vehicle();
                    newVehicle.setVehicleNumber(normalizedNumber);
                    newVehicle.setVehicleType(request.getVehicleType());
                    return vehicleRepository.save(newVehicle);
                });

        String ticketCode = generateTicketCode();
        
        ParkingTicket ticket = new ParkingTicket();
        ticket.setTicketCode(ticketCode);
        ticket.setVehicle(vehicle);
        ticket.setSlot(slot);
        ticket.setEntryTime(LocalDateTime.now());
        ticket.setStatus("ACTIVE");
        
        ParkingTicket savedTicket = ticketRepository.save(ticket);
        
        logAction("VEHICLE_ENTRY", "ParkingTicket", savedTicket.getTicketCode(), "Vehicle entered: " + normalizedNumber);
        
        return mapToResponse(savedTicket, null);
    }

    @Transactional
    public ParkingResponse processCheckout(CheckoutRequest request) {
        ParkingTicket ticket;
        
        if (request.getTicketCode() != null && !request.getTicketCode().trim().isEmpty()) {
            ticket = ticketRepository.findByTicketCode(request.getTicketCode())
                    .orElseThrow(() -> new ApiException("Ticket not found", 404));
        } else if (request.getVehicleNumber() != null && !request.getVehicleNumber().trim().isEmpty()) {
            String normalizedNumber = normalizeVehicleNumber(request.getVehicleNumber());
            ticket = ticketRepository.findTopByVehicleVehicleNumberAndStatusOrderByCreatedAtDesc(normalizedNumber, "ACTIVE")
                    .orElseThrow(() -> new ApiException("Active parking record not found for this vehicle", 404));
        } else {
            throw new ApiException("Please provide either ticket code or vehicle number", 400);
        }

        if ("COMPLETED".equals(ticket.getStatus())) {
            throw new ApiException("This ticket has already been checked out", 400);
        }

        LocalDateTime exitTime = LocalDateTime.now();
        Duration duration = Duration.between(ticket.getEntryTime(), exitTime);
        
        if (duration.isNegative()) {
            throw new ApiException("Entry time is in the future. Please check system clock.", 500);
        }

        long durationMinutes = duration.toMinutes();
        double fee = calculateFee(ticket.getVehicle().getVehicleType(), durationMinutes);
        
        ticket.setExitTime(exitTime);
        ticket.setDurationMinutes(durationMinutes);
        ticket.setDurationText(formatDuration(durationMinutes));
        ticket.setFee(fee);
        ticket.setStatus("COMPLETED");
        
        ParkingTicket updatedTicket = ticketRepository.save(ticket);
        
        // Release Slot
        ParkingSlot slot = ticket.getSlot();
        if (slot != null) {
            slot.setStatus("AVAILABLE");
            slotRepository.save(slot);
        }

        // Process Payment
        String method = (request.getPaymentMethod() != null && !request.getPaymentMethod().isEmpty()) ? request.getPaymentMethod() : "CASH";
        Payment payment = new Payment();
        payment.setTicket(updatedTicket);
        payment.setAmount(fee);
        payment.setPaymentMethod(method);
        payment.setPaymentStatus("PAID");
        payment.setPaymentTime(LocalDateTime.now());
        payment.setTransactionReference("TRX-" + System.currentTimeMillis());
        paymentRepository.save(payment);

        logAction("CHECKOUT", "ParkingTicket", updatedTicket.getTicketCode(), "Vehicle checked out. Fee: " + fee);

        return mapToResponse(updatedTicket, payment.getPaymentStatus());
    }

    private String normalizeVehicleNumber(String number) {
        return number.replaceAll("[\\s\\-]", "").toUpperCase();
    }

    private String generateTicketCode() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm"));
        String randomHex = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "KCS-" + datePart + "-" + randomHex;
    }

    private double calculateFee(String type, long durationMinutes) {
        long blocks = (long) Math.ceil((double) durationMinutes / (12 * 60));
        if (blocks == 0) blocks = 1; // minimum charge

        if ("Bike".equalsIgnoreCase(type)) {
            return blocks * 10.0;
        } else if ("Car".equalsIgnoreCase(type)) {
            return blocks * 30.0;
        }
        return 0.0;
    }

    private String formatDuration(long minutes) {
        if (minutes < 0) minutes = 0;
        long d = minutes / (24 * 60);
        long remainingAfterDays = minutes % (24 * 60);
        long h = remainingAfterDays / 60;
        long m = remainingAfterDays % 60;
        
        String dayPart = (d == 1) ? "1 day" : d + " days";
        return String.format("%s, %d hrs, %d min", dayPart, h, m);
    }

    private void logAction(String action, String type, String id, String desc) {
        AuditLog log = new AuditLog();
        log.setUsername("system"); // will be updated in phase 6 when security is added
        log.setAction(action);
        log.setEntityType(type);
        log.setEntityId(id);
        log.setDescription(desc);
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public java.util.List<ParkingResponse> getAllRecords() {
        return ticketRepository.findAll().stream()
                .map(t -> {
                    String pStatus = paymentRepository.findAll().stream()
                            .filter(p -> p.getTicket().getId().equals(t.getId()))
                            .map(Payment::getPaymentStatus)
                            .findFirst().orElse("PENDING");
                    return mapToResponse(t, pStatus);
                })
                .sorted((a, b) -> b.getEntryTime().compareTo(a.getEntryTime()))
                .toList();
    }

    private ParkingResponse mapToResponse(ParkingTicket ticket, String paymentStatus) {
        return ParkingResponse.builder()
                .ticketCode(ticket.getTicketCode())
                .vehicleNumber(ticket.getVehicle().getVehicleNumber())
                .vehicleType(ticket.getVehicle().getVehicleType())
                .slotNumber(ticket.getSlot() != null ? ticket.getSlot().getSlotNumber() : null)
                .entryTime(ticket.getEntryTime())
                .exitTime(ticket.getExitTime())
                .durationMinutes(ticket.getDurationMinutes())
                .durationText(ticket.getDurationText())
                .fee(ticket.getFee())
                .paymentStatus(paymentStatus != null ? paymentStatus : "PENDING")
                .status(ticket.getStatus())
                .build();
    }
}
