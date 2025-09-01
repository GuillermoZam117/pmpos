CREATE PROCEDURE sp_Usuarios_CRUD
    @Action    CHAR(1),       -- 'L'=Listar, 'O'=Obtener, 'C'=Crear, 'U'=Actualizar, 'D'=Eliminar
    @UsuarioId INT = NULL,
    @Name      NVARCHAR(255) = NULL,
    @PinCode   NVARCHAR(MAX)  = NULL,
    @UserRoleId INT = NULL
AS
BEGIN
    -- Implementación CRUD de usuarios
END
