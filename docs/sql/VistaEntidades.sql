CREATE VIEW dbo.VistaEntidades AS
SELECT
    e.Id AS EntidadId,
    e.Name AS Nombre,
    e.EntityTypeId,
    e.CustomData
FROM Entities e;
