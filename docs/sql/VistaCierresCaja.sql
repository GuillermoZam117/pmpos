CREATE VIEW dbo.VistaCierresCaja AS
SELECT
    w.Id AS WorkPeriodId,
    w.StartDate,
    w.EndDate,
    w.StartDescription,
    w.EndDescription,
    CASE WHEN w.EndDate IS NOT NULL THEN 1 ELSE 0 END AS Cerrado
FROM WorkPeriods w;
