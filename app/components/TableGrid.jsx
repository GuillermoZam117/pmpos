import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const TableCell = styled(Paper)(({ theme, status }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  height: '120px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: status === 'occupied' ? '#ff9800' : '#4caf50',
  color: '#fff'
}));

const TableGrid = ({ tables, onTableSelect }) => {
  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {tables.map((table) => (
        <Grid item xs={3} key={table.id}>
          <TableCell
            status={table.status}
            onClick={() => onTableSelect(table)}
          >
            <Typography variant="h6">
              Mesa {table.number}
            </Typography>
            <Typography>
              {table.status === 'occupied' ? 'Ocupada' : 'Libre'}
            </Typography>
          </TableCell>
        </Grid>
      ))}
    </Grid>
  );
};

export default TableGrid;