CREATE PROCEDURE sp_EliminarEstadoEntidad
    @EntityStateId INT
AS
    DELETE FROM EntityStates WHERE Id = @EntityStateId;
