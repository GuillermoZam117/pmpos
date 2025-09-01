CREATE PROCEDURE GetTicketsForAutofactura_1
    @ID INT
AS
BEGIN
    -- Generar el XML completo como un tipo XML para el ticket con el ID especificado
    SELECT * FROM Tickets WHERE Id = @ID;
END
