CREATE PROCEDURE sp_EditCliente
    @ClienteId INT,
    @Name NVARCHAR(255),
    @CustomData NVARCHAR(MAX) = NULL
AS
    UPDATE Entities SET Name = @Name, CustomData = @CustomData WHERE Id = @ClienteId;
