CREATE PROCEDURE sp_EliminarEntidad
    @EntidadId INT
AS
    DELETE FROM Entities WHERE Id = @EntidadId;
