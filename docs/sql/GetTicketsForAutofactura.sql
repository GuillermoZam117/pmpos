CREATE PROCEDURE GetTicketsForAutofactura
    @LastId INT
AS
BEGIN
    -- Generar el XML completo como un tipo XML, ordenado por fecha y luego por ID
    SELECT * FROM Tickets WHERE Id > @LastId ORDER BY Date, Id;
END
