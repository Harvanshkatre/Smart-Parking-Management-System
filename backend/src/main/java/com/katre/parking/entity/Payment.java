package com.katre.parking.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private ParkingTicket ticket;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod; // CASH, UPI, CARD

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus; // PENDING, PAID, FAILED, REFUNDED

    @Column(name = "transaction_reference")
    private String transactionReference;

    @Column(name = "payment_time")
    private LocalDateTime paymentTime;
}
