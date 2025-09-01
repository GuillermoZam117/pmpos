CREATE PROCEDURE sp_CerrarWorkPeriod
    @WorkPeriodId INT
AS
    UPDATE WorkPeriods SET EndDate = GETDATE() WHERE Id = @WorkPeriodId;
