CREATE PROCEDURE sp_EliminarWorkPeriod
    @WorkPeriodId INT
AS
    DELETE FROM WorkPeriods WHERE Id = @WorkPeriodId;
