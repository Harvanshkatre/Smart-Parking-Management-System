package com.katre.parking.service;

import com.katre.parking.dto.report.DashboardResponse;
import com.katre.parking.entity.ParkingTicket;
import com.katre.parking.repository.ParkingSlotRepository;
import com.katre.parking.repository.ParkingTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ParkingTicketRepository ticketRepository;
    private final ParkingSlotRepository slotRepository;

    public DashboardResponse getDashboardStats() {
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        List<ParkingTicket> allTickets = ticketRepository.findAll();
        
        long activeParking = 0;
        long todayEntries = 0;
        long todayExits = 0;
        double todayRevenue = 0;
        long bikeCount = 0;
        long carCount = 0;

        for (ParkingTicket t : allTickets) {
            if ("ACTIVE".equals(t.getStatus())) {
                activeParking++;
                if ("Bike".equalsIgnoreCase(t.getVehicle().getVehicleType())) bikeCount++;
                if ("Car".equalsIgnoreCase(t.getVehicle().getVehicleType())) carCount++;
            }
            
            if (t.getEntryTime().isAfter(startOfDay) && t.getEntryTime().isBefore(endOfDay)) {
                todayEntries++;
            }

            if ("COMPLETED".equals(t.getStatus()) && t.getExitTime() != null &&
                t.getExitTime().isAfter(startOfDay) && t.getExitTime().isBefore(endOfDay)) {
                todayExits++;
                todayRevenue += t.getFee() != null ? t.getFee() : 0;
            }
        }

        long totalSlots = slotRepository.count();
        long occupiedSlots = slotRepository.findAll().stream().filter(s -> "OCCUPIED".equals(s.getStatus())).count();
        long availableSlots = totalSlots - occupiedSlots;

        return DashboardResponse.builder()
                .activeParking(activeParking)
                .todayEntries(todayEntries)
                .todayExits(todayExits)
                .todayRevenue(todayRevenue)
                .bikeCount(bikeCount)
                .carCount(carCount)
                .totalSlots(totalSlots)
                .occupiedSlots(occupiedSlots)
                .availableSlots(availableSlots)
                .build();
    }
}
