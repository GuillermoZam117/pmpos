CREATE PROCEDURE sp_EliminarAutomationMapping
    @MapId INT
AS
    DELETE FROM AutomationCommandMaps WHERE Id = @MapId;
