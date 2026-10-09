CREATE DATABASE IF NOT EXISTS fluxodb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE fluxodb;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,

    name VARCHAR(50) NOT NULL,
    shop VARCHAR(50) NULL,
    slug VARCHAR(255) NULL UNIQUE,

    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,

    role ENUM('ADMIN', 'BARBER', 'EMPLOYEE') NOT NULL DEFAULT 'BARBER',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    value INT NOT NULL,
    duration INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_services_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_user_services (userId, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,           -- Funcionário
    serviceId INT NOT NULL,        -- Serviço do dono
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_services_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_services_service FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    UNIQUE KEY unique_user_service (userId, serviceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    ownerId INT NOT NULL,

    dayOfWeek TINYINT NOT NULL,
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    slotDuration INT NOT NULL DEFAULT 30,

    lunchStart TIME DEFAULT NULL,
    lunchEnd TIME DEFAULT NULL,

    isActive BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_agendas_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_agendas_owner FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY unique_user_day (userId, dayOfWeek)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenda_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agendaId INT NOT NULL,
    userId INT NOT NULL, 

    blockDate DATE NOT NULL,
    blockDateEnd DATE NULL,
    startTime TIME DEFAULT NULL,
    endTime TIME DEFAULT NULL, 

    reason VARCHAR(255) DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_blocks_agenda FOREIGN KEY (agendaId) REFERENCES agendas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_blocks_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_block_date (userId, blockDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    clientName VARCHAR(50) NOT NULL,
    clientEmail VARCHAR(100) NOT NULL,
    clientPhone VARCHAR(20) NOT NULL,

    barberId INT NOT NULL,
    serviceId INT NOT NULL,

    appointmentDate DATE NOT NULL,
    startTime TIME NOT NULL, 
    endTime TIME NOT NULL, 

    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW') DEFAULT 'PENDING',
    
    notes TEXT DEFAULT NULL,
    cancelReason VARCHAR(255) DEFAULT NULL,
    cancelledBy ENUM('CLIENT', 'PROFESSIONAL', 'SYSTEM') DEFAULT NULL,
    
    price INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_appointments_barber FOREIGN KEY (barberId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_appointments_service FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_appointment_date (barberId, appointmentDate),
    INDEX idx_client_email (clientEmail),
    
    UNIQUE KEY unique_barber_slot (barberId, appointmentDate, startTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    serviceId INT NULL,
    value INT NOT NULL,
    date TIMESTAMP NULL,
    type ENUM('ENTRADA', 'SAIDA', 'OUTRO') NOT NULL DEFAULT 'OUTRO',
    category VARCHAR(30) NOT NULL DEFAULT 'Sem Categoria',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_flows_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_flows_service FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    about TEXT,
    price INT NOT NULL DEFAULT 0,
    maxEmployees INT NOT NULL DEFAULT 0,
    features JSON,
    isActive BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    planId INT NOT NULL,
    pendingPlanId INT NULL,
    asaasSubscriptionId VARCHAR(100),
    asaasCustomerId VARCHAR(100),
    status ENUM('ACTIVE', 'PENDING', 'TRIAL', 'OVERDUE', 'SUSPENDED', 'CANCELLED') DEFAULT 'PENDING',
    trialEndsAt DATE,
    nextPaymentAt DATE,
    lastPaymentAt DATETIME,
    cancelledAt DATETIME,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (planId) REFERENCES plans(id),
    FOREIGN KEY (pendingPlanId) REFERENCES plans(id) ON DELETE SET NULL,
    INDEX idx_user_status (userId, status),
    INDEX idx_asaas_subscription (asaasSubscriptionId)
);

INSERT INTO plans (name, slug, description, price, maxEmployees, features) VALUES
( 'Grátis', 'free', 'Para usuários com assinatura congelada', 0, 0, '["services", "agendas"]' ),
( 'Básico', 'basic', 'Ideal para profissionais autônomos', 2990, 0, '["services", "agendas", "appointments"]' ),
( 'Profissional', 'professional', 'Para barbearias em crescimento', 6990, 4, '["services", "agendas", "appointments", "employees"]' ),
( 'Premium', 'premium', 'Para barbearias estabelecidas', 9990, 9, '["services", "agendas", "appointments", "employees", "flows"]' );