CREATE PROCEDURE sp_ResumenWorkPeriod
    @WorkPeriodId INT
AS
    -- Lógica de resumen, por ejemplo:
    SELECT * FROM VistaResumenVentasPorDia WHERE Fecha = CAST((SELECT EndDate FROM WorkPeriods WHERE Id = @WorkPeriodId) AS DATE);
