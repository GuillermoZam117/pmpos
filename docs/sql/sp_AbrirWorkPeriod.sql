CREATE PROCEDURE sp_AbrirWorkPeriod
    @WorkPeriodId INT
AS
    UPDATE WorkPeriods SET EndDate = NULL WHERE Id = @WorkPeriodId;
