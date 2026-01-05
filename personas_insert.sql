-- El error ORA-01861 ocurre porque Oracle espera un formato de fecha diferente.
-- Solución: Usa TO_DATE('yyyy-mm-dd','yyyy-mm-dd') para cada -- Actualiza los correos de los empleados existentes, asegurando máximo 25 caracteres

UPDATE PERSONA SET CORREOPER = SUBSTR('ramonmorales7808@gmail.com', 1, 25) WHERE CEDULAPER = '88308653';
UPDATE PERSONA SET CORREOPER = SUBSTR('aurajaimesb@gmail.com', 1, 25) WHERE CEDULAPER = '1005068595';
UPDATE PERSONA SET CORREOPER = SUBSTR('jennykatherinp@gmail.com', 1, 25) WHERE CEDULAPER = '37395802';
UPDATE PERSONA SET CORREOPER = SUBSTR('jhonalexgomez999@gmail.com', 1, 25) WHERE CEDULAPER = '1004914065';
UPDATE PERSONA SET CORREOPER = SUBSTR('celkin284@gmail.com', 1, 25) WHERE CEDULAPER = '1005062014';
UPDATE PERSONA SET CORREOPER = SUBSTR('alvarocruz2031283@gmail.com', 1, 25) WHERE CEDULAPER = '88267990';
UPDATE PERSONA SET CORREOPER = SUBSTR('joseangelcar93@gmail.com', 1, 25) WHERE CEDULAPER = '13391097';
UPDATE PERSONA SET CORREOPER = SUBSTR('yeraldelson@gmail.com', 1, 25) WHERE CEDULAPER = '85151087';
UPDATE PERSONA SET CORREOPER = SUBSTR('abelgoma@hotmail.es', 1, 25) WHERE CEDULAPER = '1093751465';
UPDATE PERSONA SET CORREOPER = SUBSTR('GuevaraHugo28@gmail.com', 1, 25) WHERE CEDULAPER = '1093591344';
UPDATE PERSONA SET CORREOPER = SUBSTR('GuevaraHugo28@gmail.com', 1, 25) WHERE CEDULAPER = '1093591241';
UPDATE PERSONA SET CORREOPER = SUBSTR('luisfernandoguevaraizaquita@gmail.com', 1, 25) WHERE CEDULAPER = '1090177544';

-- Para los demás empleados sin correo conocido, asigna el correo por defecto:
UPDATE PERSONA SET CORREOPER = SUBSTR('sincorreo@empresa.com', 1, 25) WHERE CORREOPER IS NULL;

SELECT * FROM dual;
-- FIN DE BLOQUE PARA PRUEBA DE INSERCIÓN

-- El error ORA-12899 indica que el valor para NOMBREPER supera el límite de 25 caracteres.
-- Solución: recorta los nombres a máximo 25 caracteres usando SUBSTR('...', 1, 25).

-- Ejemplo concreto:
-- SUBSTR('AURA ZILEMAR JAIMES BUITRAGO', 1, 25) = 'AURA ZILEMAR JAIMES BUIT'
-- Si prefieres, puedes escribir directamente el nombre recortado.

-- El error ORA-02291 indica que el valor de CT_CODIGOCT no existe en la tabla referenciada por la clave foránea.
-- Usa solo los valores de CT_CODIGOCT que existen en la tabla referenciada (según tus datos iniciales).
-- Si solo tienes un valor válido (por ejemplo, 1), usa ese valor para todos los registros.
-- Si tienes varios valores válidos, asígnalos correctamente según corresponda.

-- 1. Verifica los valores válidos de la clave primaria en la tabla referenciada (por ejemplo, consulta: `SELECT CT_CODIGOCT FROM CONTRATO`).
-- 2. Asegúrate de que todos los valores de CT_CODIGOCT en la inserción están dentro del rango válido (1-10 según tu catálogo CT).
-- 3. Usa valores de CT_CODIGOC
