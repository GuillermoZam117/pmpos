import React from 'react';
import { connect } from 'react-redux';
import Categories from './Categories';
import MenuItems from './MenuItems';
import Paper from '@mui/material/Paper'; // Updated import for MUI
import * as Actions from '../../actions';
import PropTypes from 'prop-types';

class Menu extends React.Component {
  componentDidMount() {
    console.log('🔍 Menu mounting, current menu:', this.props.menu);
    // Don't auto-load menu here - let POSView handle it
    // The menu should be passed as props from the parent component
  }

  render() {
    const {
      menu,
      menuItems,
      onMenuItemClick = () => {},
    } = this.props;
    
    // Show loading if no menu yet
    if (!menu) {
      return (
        <Paper className="menu" sx={{ p: 2, textAlign: 'center' }}>
          <div>Cargando menú...</div>
        </Paper>
      );
    }
    
    return (
      <Paper className="menu">
        <Categories
          categories={menu.categories || []}
          onCategoryClick={this.onCategoryClick}
        />
        <MenuItems menuItems={menuItems} onClick={onMenuItemClick} />
      </Paper>
    );
  }

  onCategoryClick = (category) => {
    console.log('👆 Category clicked:', category);
    this.props.changeSelectedCategory(category);
    this.props.closeMessage();
    this.refreshMenuItems(category);
  };

  refreshMenuItems(categoryName) {
    const { menu } = this.props;
    if (!menu || !menu.categories) {
      // Se muestra una notificación o se llama a una acción para reportar el error
      this.props.showMessage('El menú o las categorías no están cargados');
      return;
    }
    const selectedCategory = menu.categories.find(c => c.name === categoryName);
    if (!selectedCategory) {
      this.props.showMessage(`No se encontró la categoría: ${categoryName}`);
      return;
    }
   // Aquí continúa la lógica de actualización de los items basados en la categoría
    // Por ejemplo, se puede despachar una acción para refrescar el estado del menú
    this.props.updateMenuItems(selectedCategory.items);
  }
}

Menu.propTypes = {
    menu: PropTypes.shape({
        categories: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.required,
            color: PropTypes.string,
            foreground: PropTypes.string
        }))
    }),
    menuItems: PropTypes.array,
    onMenuItemClick: PropTypes.func
};

const mapStateToProps = (state) => {
    const appState = state.app;
    
    if (appState && typeof appState.get === 'function') {
        // Immutable.js format
        return {
            selectedCategory: appState.get('selectedCategory'),
            menu: appState.get('menu'),
            terminalId: appState.get('terminalId')
        };
    } else if (appState && typeof appState === 'object') {
        // Plain object format
        return {
            selectedCategory: appState.selectedCategory,
            menu: appState.menu,
            terminalId: appState.terminalId
        };
    }
    
    return {
        selectedCategory: null,
        menu: null,
        terminalId: null
    };
};

const mapDispatchToProps = {
  changeSelectedCategory: Actions.changeSelectedCategory,
  setOrderTagColors: Actions.setOrderTagColors,
  setMenu: Actions.setMenu,
  setMenuItems: Actions.setMenuItems,
  closeMessage: Actions.closeMessage,
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
