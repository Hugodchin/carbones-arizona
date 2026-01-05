-- Insertar los datos correctos en la tabla AREAS
DELETE FROM SYSTEM.AREAS; -- Limpia todos los datos para evitar duplicados
INSERT INTO SYSTEM.AREAS (CODIGOAREAS, NOMBRE) VALUES ('A001', 'Area Administrativa');
INSERT INTO SYSTEM.AREAS (CODIGOAREAS, NOMBRE) VALUES ('A002', 'Area Operativa');
COMMIT;
