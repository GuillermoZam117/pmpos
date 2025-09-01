CREATE PROCEDURE sp_EliminarEtiquetaOrden
    @OrderTagId INT
AS
    DELETE FROM OrderTags WHERE Id = @OrderTagId;
