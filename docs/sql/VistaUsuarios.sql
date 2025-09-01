CREATE VIEW dbo.VistaUsuarios AS
SELECT
    u.Id AS UsuarioId,
    u.Name AS Usuario,
    u.PinCode
FROM Users u;
