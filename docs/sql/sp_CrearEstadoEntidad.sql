CREATE PROCEDURE sp_CrearEstadoEntidad
    @EntidadId INT,
    @StateName NVARCHAR(255),
    @StateValue NVARCHAR(255)
AS
    INSERT INTO EntityStates (EntityId, Name, Value)
    VALUES (@EntidadId, @StateName, @StateValue);
    SELECT SCOPE_IDENTITY() AS EntityStateId;
