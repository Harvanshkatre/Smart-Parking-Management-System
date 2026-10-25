package com.katre.parking.service;

import com.katre.parking.dto.parking.CheckoutRequest;
import com.katre.parking.dto.parking.EntryRequest;
import com.katre.parking.dto.parking.ParkingResponse;
import com.katre.parking.entity.ParkingSlot;
import com.katre.parking.entity.ParkingTicket;
import com.katre.parking.entity.Vehicle;
import com.katre.parking.exception.ApiException;
import com.katre.parking.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ParkingServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private ParkingTicketRepository ticketRepository;

    @Mock
    private ParkingSlotRepository slotRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private ParkingService parkingService;

    private Vehicle testBikeVehicle;
    private ParkingSlot testBikeSlot;

    @BeforeEach
    void setUp() {
        testBikeVehicle = new Vehicle();
        testBikeVehicle.setId(1L);
        testBikeVehicle.setVehicleNumber("MH12AB1234");
        testBikeVehicle.setVehicleType("Bike");

        testBikeSlot = new ParkingSlot();
        testBikeSlot.setId(1L);
        testBikeSlot.setSlotNumber("B-01");
        testBikeSlot.setVehicleType("Bike");
        testBikeSlot.setStatus("AVAILABLE");
    }

    @Test
    @DisplayName("Should successfully process vehicle entry and assign slot")
    void testProcessEntry_Success() {
        EntryRequest request = new EntryRequest();
        request.setVehicleNumber("MH 12 AB 1234");
        request.setVehicleType("Bike");

        when(ticketRepository.existsByVehicleNumberAndStatus("MH12AB1234", "ACTIVE"))
                .thenReturn(false);
        when(slotRepository.findFirstByVehicleTypeAndStatusOrderBySlotNumberAsc("Bike", "AVAILABLE"))
                .thenReturn(Optional.of(testBikeSlot));
        when(vehicleRepository.findByVehicleNumber("MH12AB1234"))
                .thenReturn(Optional.of(testBikeVehicle));
        when(ticketRepository.save(any(ParkingTicket.class))).thenAnswer(invocation -> {
            ParkingTicket t = invocation.getArgument(0, ParkingTicket.class);
            t.setId(101L);
            return t;
        });

        ParkingResponse response = parkingService.processEntry(request);

        assertNotNull(response);
        assertEquals("MH12AB1234", response.getVehicleNumber());
        assertEquals("Bike", response.getVehicleType());
        assertEquals("B-01", response.getSlotNumber());
        assertEquals("ACTIVE", response.getStatus());
        assertTrue(response.getTicketCode().startsWith("KCS-"));
        assertEquals("OCCUPIED", testBikeSlot.getStatus());
        verify(slotRepository, times(1)).save(testBikeSlot);
    }

    @Test
    @DisplayName("Should throw ApiException if vehicle is already active")
    void testProcessEntry_DuplicateVehicle_ThrowsException() {
        EntryRequest request = new EntryRequest();
        request.setVehicleNumber("MH12AB1234");
        request.setVehicleType("Bike");

        when(ticketRepository.existsByVehicleNumberAndStatus("MH12AB1234", "ACTIVE"))
                .thenReturn(true);

        ApiException exception = assertThrows(ApiException.class, () -> parkingService.processEntry(request));
        assertEquals("Vehicle is already parked.", exception.getMessage());
        assertEquals(400, exception.getStatus());
        verify(slotRepository, never()).findFirstByVehicleTypeAndStatusOrderBySlotNumberAsc(anyString(), anyString());
    }

    @Test
    @DisplayName("Should throw ApiException if parking lot is full")
    void testProcessEntry_NoAvailableSlots_ThrowsException() {
        EntryRequest request = new EntryRequest();
        request.setVehicleNumber("MH12AB1234");
        request.setVehicleType("Bike");

        when(ticketRepository.existsByVehicleNumberAndStatus("MH12AB1234", "ACTIVE"))
                .thenReturn(false);
        when(slotRepository.findFirstByVehicleTypeAndStatusOrderBySlotNumberAsc("Bike", "AVAILABLE"))
                .thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> parkingService.processEntry(request));
        assertEquals("Bike parking is currently full.", exception.getMessage());
        assertEquals(400, exception.getStatus());
    }

    @Test
    @DisplayName("Should calculate accurate fee slabs and format duration for Bike")
    void testProcessCheckout_BikeFeeSlabs() {
        // Test 10 min parking (< 12 hours) -> ₹10
        ParkingTicket ticket1 = createMockTicket("Bike", LocalDateTime.now().minusMinutes(10));
        when(ticketRepository.findByTicketCode("KCS-001")).thenReturn(Optional.of(ticket1));
        when(ticketRepository.save(any(ParkingTicket.class))).thenAnswer(invocation -> invocation.getArgument(0, ParkingTicket.class));

        CheckoutRequest req1 = new CheckoutRequest();
        req1.setTicketCode("KCS-001");
        req1.setPaymentMethod("CASH");

        ParkingResponse resp1 = parkingService.processCheckout(req1);
        assertEquals(10.0, resp1.getFee());
        assertEquals("COMPLETED", resp1.getStatus());
        assertTrue(resp1.getDurationText().contains("hrs"));

        // Test 24 hours parking -> ₹20
        ParkingTicket ticket2 = createMockTicket("Bike", LocalDateTime.now().minusHours(24));
        when(ticketRepository.findByTicketCode("KCS-002")).thenReturn(Optional.of(ticket2));

        CheckoutRequest req2 = new CheckoutRequest();
        req2.setTicketCode("KCS-002");
        ParkingResponse resp2 = parkingService.processCheckout(req2);
        assertEquals(20.0, resp2.getFee());

        // Test 25 hours parking (24h - 36h slab) -> ₹30
        ParkingTicket ticket3 = createMockTicket("Bike", LocalDateTime.now().minusHours(25));
        when(ticketRepository.findByTicketCode("KCS-003")).thenReturn(Optional.of(ticket3));

        CheckoutRequest req3 = new CheckoutRequest();
        req3.setTicketCode("KCS-003");
        ParkingResponse resp3 = parkingService.processCheckout(req3);
        assertEquals(30.0, resp3.getFee());
        assertTrue(resp3.getDurationText().contains("1 day"));

        // Test 37 hours parking (36h - 48h slab) -> ₹40
        ParkingTicket ticket4 = createMockTicket("Bike", LocalDateTime.now().minusHours(37));
        when(ticketRepository.findByTicketCode("KCS-004")).thenReturn(Optional.of(ticket4));

        CheckoutRequest req4 = new CheckoutRequest();
        req4.setTicketCode("KCS-004");
        ParkingResponse resp4 = parkingService.processCheckout(req4);
        assertEquals(40.0, resp4.getFee());
    }

    @Test
    @DisplayName("Should calculate accurate fee slabs for Car (₹30 per 12h slab)")
    void testProcessCheckout_CarFeeSlabs() {
        // Test 2 hours parking (< 12 hours) -> ₹30
        ParkingTicket carTicket = createMockTicket("Car", LocalDateTime.now().minusHours(2));
        when(ticketRepository.findTopByVehicleVehicleNumberAndStatusOrderByCreatedAtDesc("DL01CD5678", "ACTIVE"))
                .thenReturn(Optional.of(carTicket));
        when(ticketRepository.save(any(ParkingTicket.class))).thenAnswer(invocation -> invocation.getArgument(0, ParkingTicket.class));

        CheckoutRequest req = new CheckoutRequest();
        req.setVehicleNumber("DL01CD5678");

        ParkingResponse resp = parkingService.processCheckout(req);
        assertEquals(30.0, resp.getFee());
        assertEquals("COMPLETED", resp.getStatus());
        assertEquals("AVAILABLE", carTicket.getSlot().getStatus());
    }

    @Test
    @DisplayName("Should throw ApiException if ticket code is not found")
    void testProcessCheckout_TicketNotFound_ThrowsException() {
        CheckoutRequest req = new CheckoutRequest();
        req.setTicketCode("INVALID-CODE");

        when(ticketRepository.findByTicketCode("INVALID-CODE")).thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> parkingService.processCheckout(req));
        assertEquals("Ticket not found", exception.getMessage());
        assertEquals(404, exception.getStatus());
    }

    @Test
    @DisplayName("Should throw ApiException if ticket is already checked out")
    void testProcessCheckout_AlreadyCompleted_ThrowsException() {
        ParkingTicket ticket = createMockTicket("Bike", LocalDateTime.now().minusHours(1));
        ticket.setStatus("COMPLETED");

        when(ticketRepository.findByTicketCode("KCS-COMPLETED")).thenReturn(Optional.of(ticket));

        CheckoutRequest req = new CheckoutRequest();
        req.setTicketCode("KCS-COMPLETED");

        ApiException exception = assertThrows(ApiException.class, () -> parkingService.processCheckout(req));
        assertEquals("This ticket has already been checked out", exception.getMessage());
        assertEquals(400, exception.getStatus());
    }

    @Test
    @DisplayName("Should throw ApiException if neither ticket code nor vehicle number provided")
    void testProcessCheckout_MissingParameters_ThrowsException() {
        CheckoutRequest req = new CheckoutRequest();

        ApiException exception = assertThrows(ApiException.class, () -> parkingService.processCheckout(req));
        assertEquals("Please provide either ticket code or vehicle number", exception.getMessage());
        assertEquals(400, exception.getStatus());
    }

    private ParkingTicket createMockTicket(String vehicleType, LocalDateTime entryTime) {
        Vehicle v = new Vehicle();
        v.setVehicleNumber(vehicleType.equals("Bike") ? "MH12AB1234" : "DL01CD5678");
        v.setVehicleType(vehicleType);

        ParkingSlot s = new ParkingSlot();
        s.setId(2L);
        s.setSlotNumber("B-02");
        s.setVehicleType(vehicleType);
        s.setStatus("OCCUPIED");

        ParkingTicket t = new ParkingTicket();
        t.setId(10L);
        t.setTicketCode("KCS-" + System.currentTimeMillis());
        t.setVehicle(v);
        t.setSlot(s);
        t.setEntryTime(entryTime);
        t.setStatus("ACTIVE");
        return t;
    }
}
