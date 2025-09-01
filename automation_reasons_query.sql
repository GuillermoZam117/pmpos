-- Query para obtener razones de Automation Commands para Gift y Void
-- Basado en la estructura de AutomationCommands donde Value contiene las razones

SELECT 
    ac.Id,
    ac.Name AS CommandName,
    ac.ButtonHeader,
    ac.Value AS Reason,
    ac.Color,
    CASE 
        WHEN ac.Name LIKE '%Gift%' OR ac.Name LIKE '%Regalo%' THEN 'gift'
        WHEN ac.Name LIKE '%Void%' OR ac.Name LIKE '%Anular%' OR ac.Name LIKE '%Cancel%' THEN 'void'
        ELSE 'other'
    END AS ActionType
FROM AutomationCommands ac
WHERE 
    ac.Value IS NOT NULL 
    AND ac.Value != ''
    AND (
        ac.Name LIKE '%Gift%' OR ac.Name LIKE '%Regalo%' OR
        ac.Name LIKE '%Void%' OR ac.Name LIKE '%Anular%' OR ac.Name LIKE '%Cancel%' OR
        ac.Value IN (
            'CAMBIO DE PRODUCTO',
            'PRODUCTO DE OTRA MESA', 
            'CLIENTE NO PASO POR EL',
            'ERROR DEL MESERO',
            'CAMBIO DE OPINION CLIENTE',
            'NO LO QUISO',
            'NO EXISTE EL DOMICILIO',
            'BEBIDAS DE COMBO',
            'FUERA DE TIEMPO',
            'ERROR COCINA',
            'TIEMPO EN COCINA',
            'EL CLIENTE SE FUE'
        )
    )
ORDER BY 
    ActionType,
    ac.SortOrder,
    ac.Name;