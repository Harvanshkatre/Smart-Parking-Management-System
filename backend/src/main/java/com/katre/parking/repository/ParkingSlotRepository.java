package com.katre.parking.repository;

import com.katre.parking.entity.ParkingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {
    List<ParkingSlot> findByVehicleTypeAndStatus(String vehicleType, String status);
    Optional<ParkingSlot> findFirstByVehicleTypeAndStatusOrderBySlotNumberAsc(String vehicleType, String status);
}
