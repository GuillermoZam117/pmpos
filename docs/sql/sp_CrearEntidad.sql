CREATE PROCEDURE sp_CrearEntidad
    @Name NVARCHAR(255),
    @EntityTypeId INT,
    @CustomData NVARCHAR(MAX)
AS
    INSERT INTO Entities (Name, EntityTypeId, CustomData)
    VALUES (@Name, @EntityTypeId, @CustomData);
    SELECT SCOPE_IDENTITY() AS EntidadId;
