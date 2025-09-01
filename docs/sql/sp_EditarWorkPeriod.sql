CREATE PROCEDURE sp_EditarWorkPeriod
    @WorkPeriodId INT,
    @EndDate DATETIME,
    @EndDescription NVARCHAR(255)
AS
    UPDATE WorkPeriods
    SET EndDate = @EndDate, EndDescription = @EndDescription
    WHERE Id = @WorkPeriodId;
