CREATE PROCEDURE sp_EditarPorcion
    @PortionId INT,
    @Nombre NVARCHAR(255)
AS
    UPDATE MenuItemPortions
    SET Name = @Nombre
    WHERE Id = @PortionId;
