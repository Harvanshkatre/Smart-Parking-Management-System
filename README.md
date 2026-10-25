#  Smart Parking Management System

A dynamic, production-grade parking management solution for **Bike and Car parking** at  parking  Stand.

---

## Project Structure

```
smart-parking/
|-- frontend/
|   |-- index.html        # Glassmorphism UI & Print Slip Layout
|   |-- style.css         # Modern Dark Glassmorphism Styling
|   `-- script.js         # Unified Hybrid Engine (Standalone & Backend API)
|
`-- backend/
    |-- pom.xml           # Spring Boot 3.2.4 & Maven Dependencies
    `-- src/
        |-- main/
        |   |-- java/com/katre/parking/
        |   |   |-- config/             # CORS & Web MVC Configuration
        |   |   |-- controller/         # REST API Endpoints (Parking, Dashboard)
        |   |   |-- dto/                # Request / Response Models
        |   |   |-- entity/             # JPA Entities (Vehicle, Ticket, Slot, Payment, User, AuditLog)
        |   |   |-- exception/          # Global Exception Handling
        |   |   |-- repository/         # Spring Data JPA Repositories
        |   |   |-- service/            # Core Business Logic & Fee Calculations
        |   |   `-- SmartParkingApplication.java
        |   `-- resources/
        |       `-- application.yml     # MySQL & Server Configuration
        `-- test/
            `-- java/com/katre/parking/
                `-- service/
                    `-- ParkingServiceTest.java  # Comprehensive JUnit 5 & Mockito Tests
```

---

## How to Run the Application

### 1. Frontend (Instant / Standalone)
- Open `frontend/index.html` directly in any modern browser (Chrome, Edge, Firefox, Brave).
- It runs seamlessly in **Standalone Mode** using local storage and client-side calculations, requiring zero setup!
- When the Spring Boot backend is running, it automatically switches to **Backend Connected Mode**.

### 2. Backend (Spring Boot & MySQL)
1. **Open in IntelliJ IDEA**:
   - In IntelliJ IDEA, select **File > Open** and choose `C:\Users\harva\IdeaProjects\katre-smart-parking\backend` (or open `pom.xml` as a project).
2. **Database Setup**:
   - Start your local MySQL server (port `3306`).
   - The application connects to `parking_db` and initializes the schema automatically (`hibernate.ddl-auto: update`).
3. **Run Application**:
   - Run `KatreSmartParkingApplication.java` or run `mvn spring-boot:run`.
   - The backend will start on `http://localhost:8080`.
4. **Run Unit Tests**:
   - In IntelliJ, right-click `src/test/java/.../ParkingServiceTest.java` and select **Run 'ParkingServiceTest'**.

---

## Parking Fee Slabs

### Bike Rates
- **0 - 12 hours**: Rs 10
- **12 - 24 hours**: Rs 20
- **24 - 36 hours**: Rs 30
- **36 - 48 hours**: Rs 40
- Rs 10 per 12-hour block continuously for multi-day parking.

### Car Rates
- **0 - 12 hours**: Rs 30
- **12 - 24 hours**: Rs 60
- **24 - 36 hours**: Rs 90
- **36 - 48 hours**: Rs 120
- Rs 30 per 12-hour block continuously for multi-day parking.

---

## Slot Allocation
- **Bikes**: Slots `B-01` through `B-50`.
- **Cars**: Slots `C-01` through `C-20`.
- Automatically assigned on entry and freed upon checkout.
