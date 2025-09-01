CREATE PROCEDURE sp_CrearMenu
    @Name NVARCHAR(255)
AS
    INSERT INTO ScreenMenus (Name) VALUES (@Name);
    SELECT SCOPE_IDENTITY() AS MenuId;
