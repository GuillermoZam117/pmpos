CREATE PROCEDURE sp_GetPorcion
    @PortionId INT
AS
    SELECT * FROM VistaMenuPorciones WHERE PortionId = @PortionId;
