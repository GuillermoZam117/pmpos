CREATE PROCEDURE sp_EditarEntidad
    @EntidadId INT,
    @Name NVARCHAR(255),
    @CustomData NVARCHAR(MAX)
AS
    UPDATE Entities SET Name = @Name, CustomData = @CustomData WHERE Id = @EntidadId;
