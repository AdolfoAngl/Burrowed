-- Script para crear la base de datos y usuario (ajusta los datos si es necesario)
CREATE DATABASE IF NOT EXISTS burrowed CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE burrowed;
-- Si necesitas crear un usuario específico, descomenta y ajusta:
-- CREATE USER 'root'@'localhost' IDENTIFIED BY '';
-- GRANT ALL PRIVILEGES ON burrowed.* TO 'root'@'localhost';
-- FLUSH PRIVILEGES;

GRANT ALL PRIVILEGES ON burrowed.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

SHOW databases

CREATE USER 'labuser'@'localhost' IDENTIFIED BY 'LabApp2025!';
GRANT ALL PRIVILEGES ON burrowed.* TO 'labuser'@'localhost';
FLUSH PRIVILEGES;


-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS burrowed CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE burrowed;
-- Crear el usuario (ajusta la contraseña si lo deseas)
CREATE USER IF NOT EXISTS 'labuser'@'localhost' IDENTIFIED BY 'labpass';
-- Darle todos los permisos sobre la base de datos burrowed
GRANT ALL PRIVILEGES ON burrowed.* TO 'labuser'@'localhost';
-- Aplicar los cambios de permisos
FLUSH PRIVILEGES;