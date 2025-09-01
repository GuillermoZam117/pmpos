CREATE PROCEDURE sp_CreateDepartment
    @Name NVARCHAR(255)
AS
    INSERT INTO Departments (Name) VALUES (@Name);
    SELECT SCOPE_IDENTITY() AS DepartmentId;
