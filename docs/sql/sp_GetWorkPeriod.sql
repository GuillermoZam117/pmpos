CREATE PROCEDURE sp_GetWorkPeriod
    @WorkPeriodId INT
AS
    SELECT * FROM VistaCierresCaja WHERE WorkPeriodId = @WorkPeriodId;
