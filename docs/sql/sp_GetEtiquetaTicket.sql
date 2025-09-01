CREATE PROCEDURE sp_GetEtiquetaTicket
    @TagId INT
AS
    SELECT * FROM VistaEtiquetasTicket WHERE TagId = @TagId;
