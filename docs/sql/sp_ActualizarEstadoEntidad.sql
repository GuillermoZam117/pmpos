CREATE PROCEDURE sp_ActualizarEstadoEntidad
    @EntityStateId INT,
    @StateValue NVARCHAR(255)
AS
    UPDATE EntityStates SET Value = @StateValue WHERE Id = @EntityStateId;
