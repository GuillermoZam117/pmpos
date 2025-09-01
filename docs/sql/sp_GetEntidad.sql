CREATE PROCEDURE sp_GetEntidad
    @EntidadId INT
AS
    SELECT * FROM VistaEntidades WHERE EntidadId = @EntidadId;
