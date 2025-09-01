CREATE VIEW dbo.VistaClientes AS
SELECT
    e.Id AS ClienteId,
    e.Name AS Nombre,
    e.CustomData
FROM Entities e
WHERE e.EntityTypeId = (SELECT TOP 1 Id FROM EntityTypes WHERE Name LIKE '%Cliente%');
