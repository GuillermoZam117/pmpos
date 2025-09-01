CREATE PROCEDURE sp_CrearWorkPeriod
    @StartDate DATETIME,
    @StartDescription NVARCHAR(255)
AS
    INSERT INTO WorkPeriods (StartDate, StartDescription)
    VALUES (@StartDate, @StartDescription);
    SELECT SCOPE_IDENTITY() AS WorkPeriodId;
