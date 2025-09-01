CREATE PROCEDURE sp_CreateCliente
    @Name NVARCHAR(255),
    @EntityTypeId INT,
    @CustomData NVARCHAR(MAX) = NULL
AS
    INSERT INTO Entities (Name, EntityTypeId, CustomData) VALUES (@Name, @EntityTypeId, @CustomData);
    SELECT SCOPE_IDENTITY() AS ClienteId;
