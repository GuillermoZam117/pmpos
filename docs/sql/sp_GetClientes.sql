CREATE PROCEDURE sp_GetClientes
AS
    SELECT * FROM Entities WHERE EntityTypeId = (SELECT TOP 1 Id FROM EntityTypes WHERE Name LIKE '%Cliente%');
