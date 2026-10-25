package com.katre.parking.repository;

import com.katre.parking.entity.ParkingTicket;
import com.katre.parking.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface ParkingTicketRepository extends JpaRepository<ParkingTicket, Long> {
    
    Optional<ParkingTicket> findByTicketCode(String ticketCode);
    
    List<ParkingTicket> findByVehicleAndStatus(Vehicle vehicle, String status);

    @Query("SELECT COUNT(t) > 0 FROM ParkingTicket t WHERE t.vehicle.vehicleNumber = :vehicleNumber AND t.status = :status")
    boolean existsByVehicleNumberAndStatus(@Param("vehicleNumber") String vehicleNumber, @Param("status") String status);
    
    Optional<ParkingTicket> findTopByVehicleVehicleNumberAndStatusOrderByCreatedAtDesc(String vehicleNumber, String status);
}
