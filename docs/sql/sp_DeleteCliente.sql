CREATE PROCEDURE sp_DeleteCliente
    @ClienteId INT
AS
    DELETE FROM Entities WHERE Id = @ClienteId;
