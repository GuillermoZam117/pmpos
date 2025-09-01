CREATE PROCEDURE sp_CrearPorcion
    @MenuItemId INT,
    @Nombre NVARCHAR(255)
AS
    INSERT INTO MenuItemPortions (MenuItemId, Name)
    VALUES (@MenuItemId, @Nombre);
    SELECT SCOPE_IDENTITY() AS PortionId;
